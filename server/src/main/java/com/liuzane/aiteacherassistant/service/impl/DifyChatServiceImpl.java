package com.liuzane.aiteacherassistant.service.impl;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

import com.liuzane.aiteacherassistant.service.DifyChatService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;

import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;
import reactor.util.retry.Retry;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

@Slf4j
@Service
public class DifyChatServiceImpl implements DifyChatService {

  @Value("${dify.api.url}")
  private String difyApiUrl;

  @Value("${dify.api.key}")
  private String apiKey;

  private final WebClient webClient = WebClient.create();
  private final ObjectMapper objectMapper = new ObjectMapper();
  private Boolean thinking = false;

  /** 心跳间隔：超过该时长没有数据推送时发一次心跳，避免前端/网关长时间无数据而断流 */
  private static final Duration HEARTBEAT_INTERVAL = Duration.ofMinutes(1);

  /** 网络瞬时错误时最多重试次数（Connection reset、超时等） */
  private static final int MAX_RETRY_ATTEMPTS = 2;

  @Override
  public Flux<String> sendMessageStream(String query, String userId, String conversationId) {
    Map<String, Object> body = new HashMap<>();
    body.put("query", query);
    body.put("user", userId);
    body.put("inputs", new HashMap<>());
    body.put("response_mode", "streaming");
    if (conversationId != null && !conversationId.isBlank()) {
      body.put("conversation_id", conversationId);
    }

    return webClient.post()
        .uri(difyApiUrl + "/chat-messages")
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
        .contentType(MediaType.APPLICATION_JSON)
        .bodyValue(body)
        .exchangeToFlux(response -> handleSseResponse(response))
        .retryWhen(Retry.backoff(MAX_RETRY_ATTEMPTS, Duration.ofSeconds(1))
            .filter(t -> isRetryable(t))
            .doBeforeRetry(signal -> log.warn("调用 Dify 流式接口失败，第 {} 次重试: {}",
                signal.totalRetries() + 1, signal.failure().getMessage())))
        .map(line -> line.startsWith("data:") ? line.substring(5).trim() : line)
        .filter(data -> !data.isEmpty())
        .flatMap(this::translateDifyEvent)
        .doOnError(e -> log.error("调用 Dify 流式接口失败: {}", e.getMessage()))
        .transform(this::withHeartbeat);
  }

  /**
   * 判断异常是否可重试：网络层瞬时错误（连接重置、超时、连接拒绝等）可重试，
   * HTTP 4xx/5xx 不可重试（已由 handleSseResponse 转为 RuntimeException）。
   */
  private boolean isRetryable(Throwable t) {
    String msg = t.getMessage() == null ? "" : t.getMessage().toLowerCase();
    return msg.contains("connection reset")
        || msg.contains("connection refused")
        || msg.contains("timeout")
        || msg.contains("timed out")
        || msg.contains("unexpected end of stream")
        || t instanceof java.io.IOException;
  }

  /**
   * 统一处理 SSE 响应：非 2xx 时读取错误体并抛出带状态码和响应片段的异常；
   * 2xx 时直接返回 body flux。
   */
  private Flux<String> handleSseResponse(ClientResponse response) {
    HttpStatusCode status = response.statusCode();
    if (status.is2xxSuccessful()) {
      return response.bodyToFlux(String.class);
    }
    // 非 2xx：读取完整错误体后抛异常
    return response.bodyToMono(String.class)
        .flatMapMany(body -> {
          String snippet = body == null ? "(empty)" : (body.length() > 300 ? body.substring(0, 300) + "..." : body);
          String msg = String.format("调用 Dify 流式接口失败: HTTP %d, 响应片段=%s", status.value(), snippet);
          log.error(msg);
          return Flux.error(new RuntimeException(msg));
        });
  }

  /**
   * 为空闲的流补充心跳事件：距上一条数据超过 HEARTBEAT_INTERVAL 时推送一条 HEARTBEAT，
   * 源流结束时同步停止心跳。
   *
   * @param source 原始事件流
   * @return 带心跳的事件流
   */
  private Flux<String> withHeartbeat(Flux<String> source) {
    AtomicLong lastPushAt = new AtomicLong(System.currentTimeMillis());
    Sinks.One<Boolean> sourceTerminated = Sinks.one();

    Flux<String> heartbeat = Flux.interval(HEARTBEAT_INTERVAL)
        .filter(tick -> System.currentTimeMillis() - lastPushAt.get() >= HEARTBEAT_INTERVAL.toMillis())
        .map(tick -> toJson("HEARTBEAT", objectMapper.createObjectNode()))
        .takeUntilOther(sourceTerminated.asMono());

    Flux<String> data = source
        .doOnNext(event -> lastPushAt.set(System.currentTimeMillis()))
        .doFinally(signal -> sourceTerminated.tryEmitValue(Boolean.TRUE));

    return Flux.merge(data, heartbeat);
  }

  private Flux<String> translateDifyEvent(String dataStr) {
    try {
      JsonNode node = objectMapper.readTree(dataStr);
      String event = node.path("event").asText();

      switch (event) {
        // 工作流开始事件
        case "workflow_started": {
          ObjectNode obj = objectMapper.createObjectNode();
          obj.put("conversationId", node.path("conversation_id").asText());
          obj.put("messageId", node.path("message_id").asText());
          obj.put("createdAt", node.path("created_at").asText());
          return Flux.just(toJson("WORKFLOW_STARTED", obj));
        }

        // 节点开始事件
        case "node_started": {
          ObjectNode obj = objectMapper.createObjectNode();
          obj.put("createdAt", node.path("created_at").asText());

          JsonNode data = node.path("data");
          String nodeType = data.path("node_type").asText();
          String nodeTitle = data.path("title").asText();

          if (nodeType.equals("knowledge-retrieval")) {
            return Flux.just(toJson("KNOWLEDGE_RETRIEVAL_STARTED", obj));
          } else if (nodeType.equals("llm")) {
            if (nodeTitle.contains("意图识别")) {
              return Flux.just(toJson("INTENT_RECOGNITION_STARTED", obj));
            } else {
              return Flux.just(toJson("TEXT_STARTED", obj));
            }
          }
        }

        // 节点完成事件
        case "node_finished": {
          ObjectNode obj = objectMapper.createObjectNode();
          obj.put("createdAt", node.path("created_at").asLong());

          JsonNode data = node.path("data");
          String nodeType = data.path("node_type").asText();
          String nodeTitle = data.path("title").asText();

          if ("knowledge-retrieval".equals(nodeType)) {
            JsonNode result = data.path("outputs").path("result");
            // result 是数组，直接 set，不要 asText()
            obj.set("result", result.isArray() ? result : objectMapper.createArrayNode());
            return Flux.just(toJson("KNOWLEDGE_RETRIEVAL_FINISHED", obj));
          } else if ("llm".equals(nodeType)) {
            if (nodeTitle.contains("意图识别")) {
              return Flux.just(toJson("INTENT_RECOGNITION_FINISHED", obj));
            } else {
              obj.put("text", data.path("outputs").path("text").asText(""));
              return Flux.just(toJson("TEXT_FINISHED", obj));
            }
          }
          // 其他节点类型（start/end/if-else/代码节点等）不往下传
          return Flux.empty();
        }

        // 消息事件
        case "message": {
          ObjectNode obj = objectMapper.createObjectNode();
          String text = node.path("answer").asText();
          if (text.contains("<think>")) {
            thinking = true;
          } else if (text.contains("</think>")) {
            thinking = false;
            text = text.substring(text.indexOf("</think>") + 9);
          }
          if (thinking) {
            return Flux.empty();
          }
          obj.put("text", text);
          return Flux.just(toJson("MESSAGE", obj));
        }

        // 工作流完成事件
        case "workflow_finished": {
          return Flux.just(toJson("WORKFLOW_FINISHED", null));
        }

        default:
          return Flux.empty(); // ping、node_finished 等静默丢弃
      }
    } catch (Exception e) {
      log.warn("解析 Dify SSE 事件失败: {}", dataStr, e);
      return Flux.empty();
    }
  }

  /**
   * 将 Dify 事件数据转换为 JSON 字符串
   * 
   * @param type 事件类型
   * @param data 事件数据
   * @return JSON 字符串
   */
  private String toJson(String type, ObjectNode data) {
    ObjectNode root = objectMapper.createObjectNode();
    root.put("type", type);
    if (data != null) {
      root.setAll(data);
    }
    return root.toString();
  }

  // private String toAnswerJson(String text, String reasoning) {
  // ObjectNode root = objectMapper.createObjectNode();
  // root.put("type", "answer").put("code", "ANSWER");
  // ObjectNode content = root.putObject("content");
  // if (text != null)
  // content.put("text", text);
  // if (reasoning != null)
  // content.put("reasoning_content", reasoning);
  // return root.toString();
  // }
}

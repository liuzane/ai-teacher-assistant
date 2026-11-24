package com.liuzane.aiteachingassistant.service.impl;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Function;

import com.liuzane.aiteachingassistant.model.dto.response.WorkflowRunDetailResponse;
import com.liuzane.aiteachingassistant.service.DifyChatService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import reactor.util.retry.Retry;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

@Slf4j
@Service
@RequiredArgsConstructor
public class DifyChatServiceImpl implements DifyChatService {

  @Value("${dify.api.url}")
  private String difyApiUrl;

  @Value("${dify.api.key}")
  private String apiKey;

  private final RedisTemplate<String, String> redisTemplate;

  private final WebClient webClient = WebClient.create();
  private final ObjectMapper objectMapper = new ObjectMapper();
  private Boolean thinking = false;

  /** 工作流运行信息在 Redis 中的 Key 前缀，完整 Key 为 dify:workflow:{conversationId}，存储 Hash 结构 */
  private static final String WORKFLOW_RUN_ID_KEY_PREFIX = "dify:workflow:";

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

  @Override
  public Mono<WorkflowRunDetailResponse> getWorkflowRunDetail(String conversationId) {
    Map<String, String> info = getWorkflowRunInfo(conversationId);
    String workflowRunId = info.get("workflowRunId");
    if (workflowRunId == null || workflowRunId.isBlank()) {
      return Mono.error(new RuntimeException("未找到工作流运行记录，请稍后重试或发起新对话"));
    }

    return webClient.get()
        .uri(URI.create(difyApiUrl + "/workflows/run/" + encode(workflowRunId)))
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
        .accept(MediaType.APPLICATION_JSON)
        .exchangeToMono(response -> handleResponse(response, body -> {
          JsonNode root = objectMapper.readTree(body);
          WorkflowRunDetailResponse resp = new WorkflowRunDetailResponse();
          resp.setStatus(root.path("status").asText());
          resp.setError(nullableText(root, "error"));
          JsonNode elapsed = root.path("elapsed_time");
          resp.setElapsedTime(elapsed.isNull() || elapsed.isMissingNode() ? null : elapsed.asDouble());
          resp.setCreatedAt(root.path("created_at").asLong());
          JsonNode finished = root.path("finished_at");
          resp.setFinishedAt(finished.isNull() || finished.isMissingNode() ? null : finished.asLong());
          return resp;
        }, "获取工作流执行情况"));
  }

  @Override
  public Mono<String> stopChatMessage(String conversationId, String userId) {
    Map<String, String> info = getWorkflowRunInfo(conversationId);
    String taskId = info.get("taskId");
    if (taskId == null || taskId.isBlank()) {
      return Mono.error(new RuntimeException("未找到消息生成任务，无法停止"));
    }

    Map<String, Object> body = new HashMap<>();
    body.put("user", userId);
    return webClient.post()
        .uri(URI.create(difyApiUrl + "/chat-messages/" + encode(taskId) + "/stop"))
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
        .contentType(MediaType.APPLICATION_JSON)
        .accept(MediaType.APPLICATION_JSON)
        .bodyValue(body)
        .exchangeToMono(response -> handleResponse(response,
            respBody -> objectMapper.readTree(respBody).path("result").asText(), "停止对话消息生成"));
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
          String conversationId = node.path("conversation_id").asText();
          ObjectNode obj = objectMapper.createObjectNode();
          obj.put("conversationId", conversationId);
          obj.put("messageId", node.path("message_id").asText());
          obj.put("createdAt", node.path("created_at").asText());
          saveWorkflowRunInfo(conversationId, node.path("workflow_run_id").asText(), node.path("task_id").asText());
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
   * 记录本次工作流的运行信息，使用 Redis Hash 存储，Key 为 dify:workflow:{conversationId}，
   * Field 为 workflowRunId、taskId，便于后续按会话反查 Dify 工作流执行记录。
   *
   * @param conversationId 会话 ID
   * @param workflowRunId  工作流运行 ID
   * @param taskId         任务 ID
   */
  private void saveWorkflowRunInfo(String conversationId, String workflowRunId, String taskId) {
    if (conversationId == null || conversationId.isBlank()
        || workflowRunId == null || workflowRunId.isBlank()) {
      return;
    }
    try {
      String key = WORKFLOW_RUN_ID_KEY_PREFIX + conversationId;
      Map<String, String> hashMap = new HashMap<>();
      hashMap.put("workflowRunId", workflowRunId);
      hashMap.put("taskId", taskId);
      redisTemplate.<String, String>opsForHash().putAll(key, hashMap);
      redisTemplate.expire(key, Duration.ofHours(3));
    } catch (Exception e) {
      // 缓存失败不影响对话主流程
      log.warn("写入 workflow_run_info 到 Redis 失败, conversationId={}: {}", conversationId, e.getMessage());
    }
  }

  /**
   * 从 Redis 读取本次会话的工作流运行信息，Key 为 dify:workflow:{conversationId}，
   * Field 为 workflowRunId、taskId。读取失败时返回空 Map，不影响主流程。
   *
   * @param conversationId 会话 ID
   * @return 包含 workflowRunId / taskId 的 Map，无记录时为空 Map
   */
  private Map<String, String> getWorkflowRunInfo(String conversationId) {
    if (conversationId == null || conversationId.isBlank()) {
      return Collections.emptyMap();
    }
    try {
      String key = WORKFLOW_RUN_ID_KEY_PREFIX + conversationId;
      Map<String, String> entries = redisTemplate.<String, String>opsForHash().entries(key);
      return entries == null ? Collections.emptyMap() : entries;
    } catch (Exception e) {
      log.warn("读取 workflow_run_info 失败, conversationId={}: {}", conversationId, e.getMessage());
      return Collections.emptyMap();
    }
  }

  /**
   * 读取可空字符串字段，字段缺失或为 null 时返回 null
   */
  private String nullableText(JsonNode node, String field) {
    JsonNode value = node.path(field);
    return value.isMissingNode() || value.isNull() ? null : value.asText();
  }

  /**
   * 对字符串进行 URL 编码，确保在 Dify API 路径中安全使用
   */
  private String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }

  /**
   * 统一处理 WebClient 响应：非 2xx 抛出带响应片段的异常；2xx 时调用解析函数。
   *
   * @param response  WebClient 响应
   * @param parser    JSON 解析函数
   * @param operation 操作描述（用于日志）
   * @return 解析结果
   */
  private <T> Mono<T> handleResponse(ClientResponse response, Function<String, T> parser, String operation) {
    HttpStatusCode status = response.statusCode();
    return response.bodyToMono(String.class)
        .flatMap(body -> {
          if (!status.is2xxSuccessful()) {
            String snippet = body.length() > 200 ? body.substring(0, 200) + "..." : body;
            String msg = String.format("%s 失败: HTTP %d, 响应片段=%s", operation, status.value(), snippet);
            log.error(msg);
            return Mono.error(new RuntimeException(msg));
          }
          try {
            return Mono.just(parser.apply(body));
          } catch (Exception e) {
            String snippet = body.length() > 200 ? body.substring(0, 200) + "..." : body;
            String msg = String.format("%s 响应解析失败: %s, HTTP %d, 响应片段=%s", operation, e.getMessage(),
                status.value(), snippet);
            log.error(msg, e);
            return Mono.error(new RuntimeException(msg, e));
          }
        });
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

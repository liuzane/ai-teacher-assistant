package com.liuzane.aiteachingassistant.service.impl;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.liuzane.aiteachingassistant.model.dto.request.ConversationRenameRequest;
import com.liuzane.aiteachingassistant.model.dto.response.ConversationMessageResponse;
import com.liuzane.aiteachingassistant.model.dto.response.ConversationListItem;
import com.liuzane.aiteachingassistant.model.dto.response.ConversationListResponse;
import com.liuzane.aiteachingassistant.model.dto.response.ConversationMessageItem;
import com.liuzane.aiteachingassistant.service.DifyConversationService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;

import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Slf4j
@Service
public class DifyConversationServiceImpl implements DifyConversationService {

  @Value("${dify.api.url}")
  private String difyApiUrl;

  @Value("${dify.api.key}")
  private String apiKey;

  private final WebClient webClient = WebClient.create();
  private final ObjectMapper objectMapper = new ObjectMapper();

  @Override
  public Mono<ConversationListResponse> getConversations(String userId, String lastId, Integer limit, String sortBy) {
    int pageSize = limit == null ? 20 : Math.min(Math.max(limit, 1), 100);
    String sort = sortBy == null || sortBy.isBlank() ? "-updated_at" : sortBy;

    StringBuilder url = new StringBuilder(difyApiUrl)
        .append("/conversations?user=").append(encode(userId))
        .append("&limit=").append(pageSize)
        .append("&sort_by=").append(encode(sort));
    if (lastId != null && !lastId.isBlank()) {
      url.append("&last_id=").append(encode(lastId));
    }

    return webClient.get()
        .uri(URI.create(url.toString()))
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
        .accept(MediaType.APPLICATION_JSON)
        .exchangeToMono(response -> handleResponse(response, body -> {
          JsonNode root = objectMapper.readTree(body);

          List<ConversationListItem> items = new ArrayList<>();
          JsonNode dataNode = root.path("data");
          if (dataNode.isArray()) {
            for (JsonNode node : dataNode) {
              ConversationListItem item = new ConversationListItem();
              item.setId(node.path("id").asText());
              item.setName(node.path("name").asText());
              item.setStatus(node.path("status").asText());
              item.setIntroduction(nullableText(node, "introduction"));
              item.setCreatedAt(node.path("created_at").asLong());
              item.setUpdatedAt(node.path("updated_at").asLong());
              JsonNode inputsNode = node.path("inputs");
              if (inputsNode.isObject() && !inputsNode.isEmpty()) {
                try {
                  @SuppressWarnings("unchecked")
                  Map<String, Object> inputs = objectMapper.treeToValue(inputsNode, Map.class);
                  item.setInputs(inputs);
                } catch (Exception e) {
                  log.warn("解析 Dify inputs 字段失败，跳过：{}", e.getMessage());
                }
              }
              items.add(item);
            }
          }

          ConversationListResponse listResponse = new ConversationListResponse();
          listResponse.setData(items);
          listResponse.setHasMore(root.path("has_more").asBoolean());
          listResponse.setLimit(root.path("limit").asInt());
          return listResponse;
        }, "获取 Dify 会话列表"));
  }

  @Override
  public Mono<ConversationMessageResponse> getMessages(String conversationId, String userId, String firstId,
      Integer limit) {
    int pageSize = limit == null ? 20 : Math.min(Math.max(limit, 1), 100);

    StringBuilder url = new StringBuilder(difyApiUrl)
        .append("/messages?conversation_id=").append(encode(conversationId))
        .append("&limit=").append(pageSize);
    if (userId != null && !userId.isBlank()) {
      url.append("&user=").append(encode(userId));
    }
    if (firstId != null && !firstId.isBlank()) {
      url.append("&first_id=").append(encode(firstId));
    }

    return webClient.get()
        .uri(URI.create(url.toString()))
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
        .accept(MediaType.APPLICATION_JSON)
        .exchangeToMono(response -> handleResponse(response, body -> {
          JsonNode root = objectMapper.readTree(body);

          List<ConversationMessageItem> items = new ArrayList<>();
          JsonNode dataNode = root.path("data");
          if (dataNode.isArray()) {
            for (JsonNode node : dataNode) {
              ConversationMessageItem item = new ConversationMessageItem();
              item.setId(node.path("id").asText());
              item.setConversationId(node.path("conversation_id").asText());
              item.setQuery(node.path("query").asText());
              item.setAnswer(node.path("answer").asText());
              item.setMessageFiles(node.path("message_files"));
              item.setRetrieverResources(node.path("retriever_resources"));
              item.setExtraContents(node.path("extra_contents"));
              item.setFeedback(node.path("feedback"));
              item.setStatus(node.path("status").asText());
              item.setError(nullableText(node, "error"));
              item.setCreatedAt(node.path("created_at").asLong());
              item.setMessageTokens(node.path("message_tokens").asInt());
              item.setAnswerTokens(node.path("answer_tokens").asInt());
              items.add(item);
            }
          }

          ConversationMessageResponse messageResponse = new ConversationMessageResponse();
          messageResponse.setData(items);
          messageResponse.setHasMore(root.path("has_more").asBoolean());
          messageResponse.setLimit(root.path("limit").asInt());
          return messageResponse;
        }, "获取 Dify 会话历史消息"));
  }

  @Override
  public Mono<String> renameConversation(String conversationId, String userId,
      ConversationRenameRequest request) {
    Map<String, Object> body = new HashMap<>();
    if (request.getName() != null) {
      body.put("name", request.getName());
    }
    if (userId != null) {
      body.put("user", userId);
    }
    return webClient.post()
        .uri(URI.create(difyApiUrl + "/conversations/" + encode(conversationId) + "/name"))
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
        .contentType(MediaType.APPLICATION_JSON)
        .accept(MediaType.APPLICATION_JSON)
        .bodyValue(body)
        .exchangeToMono(response -> handleResponse(response,
            respBody -> objectMapper.readTree(respBody).path("name").asText(), "重命名 Dify 会话"));
  }

  @Override
  public Mono<Void> deleteConversation(String conversationId, String userId) {
    Map<String, String> body = new HashMap<>();
    if (userId != null && !userId.isBlank()) {
      body.put("user", userId);
    }
    return webClient.method(HttpMethod.DELETE)
        .uri(URI.create(difyApiUrl + "/conversations/" + encode(conversationId)))
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
        .contentType(MediaType.APPLICATION_JSON)
        .accept(MediaType.APPLICATION_JSON)
        .bodyValue(body)
        .exchangeToMono(response -> {
          HttpStatusCode status = response.statusCode();
          return response.bodyToMono(String.class)
              .flatMap(respBody -> {
                if (!status.is2xxSuccessful()) {
                  String snippet = respBody.length() > 200 ? respBody.substring(0, 200) + "..." : respBody;
                  String msg = String.format("删除 Dify 会话失败: HTTP %d, 响应片段=%s", status.value(), snippet);
                  log.error(msg);
                  return Mono.error(new RuntimeException(msg));
                }
                return Mono.empty();
              });
        });
  }

  /**
   * 读取可空字符串字段，字段缺失或为 null 时返回 null
   *
   * @param node  消息节点
   * @param field 字段名
   * @return 字段值
   */
  private String nullableText(JsonNode node, String field) {
    JsonNode value = node.path(field);
    return value.isMissingNode() || value.isNull() ? null : value.asText();
  }

  /**
   * 对字符串进行 URL 编码，确保在 Dify API 中安全使用
   *
   * @param value 待编码的字符串
   * @return 编码后的字符串
   */
   private String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }

  /**
   * 统一处理 WebClient 响应：检查 HTTP 状态码，非 2xx 抛出带响应片段的异常；2xx 时调用解析函数。
   *
   * @param response  WebClient 响应
   * @param parser    JSON 解析函数
   * @param operation 操作描述（用于日志）
   * @return 解析结果
   */
  private <T> Mono<T> handleResponse(ClientResponse response, java.util.function.Function<String, T> parser,
      String operation) {
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
}

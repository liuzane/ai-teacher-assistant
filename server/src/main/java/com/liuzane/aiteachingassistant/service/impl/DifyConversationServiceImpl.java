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

    return webClient.get()
        .uri(buildConversationsUri(userId, lastId, pageSize, sort))
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
        .accept(MediaType.APPLICATION_JSON)
        .exchangeToMono(response -> handleResponse(response, this::parseConversationList, "获取 Dify 会话列表"));
  }

  @Override
  public Mono<ConversationMessageResponse> getMessages(String conversationId, String userId, String firstId,
      Integer limit) {
    int pageSize = limit == null ? 20 : Math.min(Math.max(limit, 1), 100);

    return webClient.get()
        .uri(buildMessagesUri(conversationId, userId, firstId, pageSize))
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
        .accept(MediaType.APPLICATION_JSON)
        .exchangeToMono(response -> handleResponse(response, this::parseConversationMessages, "获取 Dify 会话历史消息"));
  }

  /**
   * 拼接获取会话历史消息的请求地址，查询参数统一做 URL 编码
   *
   * @param conversationId 会话 ID
   * @param userId         终端用户标识，可为空
   * @param firstId        分页游标，可为空
   * @param limit          每页消息数量
   * @return 请求地址
   */
  private URI buildMessagesUri(String conversationId, String userId, String firstId, int limit) {
    StringBuilder url = new StringBuilder(difyApiUrl)
        .append("/messages?conversation_id=").append(encode(conversationId))
        .append("&limit=").append(limit);
    if (userId != null && !userId.isBlank()) {
      url.append("&user=").append(encode(userId));
    }
    if (firstId != null && !firstId.isBlank()) {
      url.append("&first_id=").append(encode(firstId));
    }
    return URI.create(url.toString());
  }

  /**
   * 解析 Dify 返回的会话历史消息 JSON（字段为下划线命名）
   *
   * @param body 响应体
   * @return 会话历史消息
   */
  private ConversationMessageResponse parseConversationMessages(String body) {
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

    ConversationMessageResponse response = new ConversationMessageResponse();
    response.setData(items);
    response.setHasMore(root.path("has_more").asBoolean());
    response.setLimit(root.path("limit").asInt());
    return response;
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
   * 拼接获取会话列表的请求地址，查询参数统一做 URL 编码
   *
   * @param userId 终端用户标识
   * @param lastId 分页游标，可为空
   * @param limit  每页记录数
   * @param sortBy 排序字段
   * @return 请求地址
   */
  private URI buildConversationsUri(String userId, String lastId, int limit, String sortBy) {
    StringBuilder url = new StringBuilder(difyApiUrl)
        .append("/conversations?user=").append(encode(userId))
        .append("&limit=").append(limit)
        .append("&sort_by=").append(encode(sortBy));
    if (lastId != null && !lastId.isBlank()) {
      url.append("&last_id=").append(encode(lastId));
    }
    return URI.create(url.toString());
  }

  private String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }

  /**
   * 统一处理 WebClient 响应：检查 HTTP 状态码，非 2xx 抛出带响应片段的异常；2xx 时调用解析函数。
   *
   * @param response    WebClient 响应
   * @param parser      JSON 解析函数
   * @param operation   操作描述（用于日志）
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

  /**
   * 解析 Dify 返回的会话列表 JSON（字段为下划线命名）
   *
   * @param body 响应体
   * @return 会话列表
   */
  private ConversationListResponse parseConversationList(String body) {
    JsonNode root = objectMapper.readTree(body);

    List<ConversationListItem> items = new ArrayList<>();
    JsonNode dataNode = root.path("data");
    if (dataNode.isArray()) {
      for (JsonNode node : dataNode) {
        items.add(parseConversationItem(node));
      }
    }

    ConversationListResponse response = new ConversationListResponse();
    response.setData(items);
    response.setHasMore(root.path("has_more").asBoolean());
    response.setLimit(root.path("limit").asInt());
    return response;
  }

  /**
   * 解析 Dify 返回的单个会话对象（列表项、重命名返回体通用）
   *
   * @param node 会话 JSON 节点
   * @return 会话对象
   */
  private ConversationListItem parseConversationItem(JsonNode node) {
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
    return item;
  }

  @Override
  public Mono<ConversationListItem> renameConversation(String conversationId, ConversationRenameRequest request) {
    return webClient.post()
        .uri(URI.create(difyApiUrl + "/conversations/" + encode(conversationId) + "/name"))
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
        .contentType(MediaType.APPLICATION_JSON)
        .accept(MediaType.APPLICATION_JSON)
        .bodyValue(toRenamingRequestBody(request))
        .exchangeToMono(response -> handleResponse(response, body -> parseConversationItem(objectMapper.readTree(body)),
            "重命名 Dify 会话"));
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
   * 将重命名 DTO 转换为 Dify 要求的 JSON Map。
   * Dify 字段：{@code name}、{@code auto_generate}、{@code user}。
   *
   * @param request 重命名 DTO
   * @return JSON 可序列化的 Map
   */
  private Map<String, Object> toRenamingRequestBody(ConversationRenameRequest request) {
    Map<String, Object> body = new HashMap<>();
    if (request.getName() != null) {
      body.put("name", request.getName());
    }
    if (request.getAutoGenerate() != null) {
      body.put("auto_generate", request.getAutoGenerate());
    }
    if (request.getUser() != null) {
      body.put("user", request.getUser());
    }
    return body;
  }
}

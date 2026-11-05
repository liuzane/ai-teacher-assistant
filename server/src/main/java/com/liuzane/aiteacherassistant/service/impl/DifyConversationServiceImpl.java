package com.liuzane.aiteacherassistant.service.impl;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import com.liuzane.aiteacherassistant.model.dto.response.ConversationMessageResponse;
import com.liuzane.aiteacherassistant.model.dto.response.ConversationListItem;
import com.liuzane.aiteacherassistant.model.dto.response.ConversationListResponse;
import com.liuzane.aiteacherassistant.model.dto.response.ConversationMessageItem;
import com.liuzane.aiteacherassistant.service.DifyConversationService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
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
        .retrieve()
        .bodyToMono(String.class)
        .map(this::parseConversationList)
        .doOnError(e -> log.error("获取 Dify 会话列表失败: {}", e.getMessage()));
  }

  @Override
  public Mono<ConversationMessageResponse> getMessages(String conversationId, String userId, String firstId,
      Integer limit) {
    int pageSize = limit == null ? 20 : Math.min(Math.max(limit, 1), 100);

    return webClient.get()
        .uri(buildMessagesUri(conversationId, userId, firstId, pageSize))
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .bodyToMono(String.class)
        .map(this::parseConversationHistory)
        .doOnError(e -> log.error("获取 Dify 会话历史消息失败: {}", e.getMessage()));
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
  private ConversationMessageResponse parseConversationHistory(String body) {
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
        ConversationListItem item = new ConversationListItem();
        item.setId(node.path("id").asText());
        item.setName(node.path("name").asText());
        item.setStatus(node.path("status").asText());
        item.setCreatedAt(node.path("created_at").asLong());
        item.setUpdatedAt(node.path("updated_at").asLong());
        items.add(item);
      }
    }

    ConversationListResponse response = new ConversationListResponse();
    response.setData(items);
    response.setHasMore(root.path("has_more").asBoolean());
    response.setLimit(root.path("limit").asInt());
    return response;
  }
}

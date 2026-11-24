package com.liuzane.aiteachingassistant.service;

import com.liuzane.aiteachingassistant.model.dto.request.ConversationRenameRequest;
import com.liuzane.aiteachingassistant.model.dto.response.ConversationMessageResponse;
import com.liuzane.aiteachingassistant.model.dto.response.ConversationListResponse;

import reactor.core.publisher.Mono;

public interface DifyConversationService {

  /**
   * 获取某个终端用户的会话列表（按最近活跃时间排序）
   *
   * @param userId 终端用户标识
   * @param lastId 分页游标：当前页最后一个会话的 id，为空则获取第一页
   * @param limit  返回的记录数（1-100）
   * @param sortBy 排序字段，加 "-" 前缀表示降序
   * @return Dify 会话列表
   */
  Mono<ConversationListResponse> getConversations(String userId, String lastId, Integer limit, String sortBy);

  /**
   * 获取某个会话的历史消息（按时间倒序，最新在前）
   *
   * @param conversationId 会话 ID
   * @param userId         终端用户标识，可为空
   * @param firstId        分页游标：当前页第一条消息的 id，为空则获取最新消息
   * @param limit          返回的消息数量（1-100）
   * @return Dify 会话历史消息
   */
  Mono<ConversationMessageResponse> getMessages(String conversationId, String userId, String firstId, Integer limit);

  /**
   * 重命名会话。
   *
   * @param conversationId 会话 ID
   * @param userId         终端用户标识，作为 Dify 请求体的 {@code user} 字段传入
   * @param request        重命名请求体（仅含 name）
   * @return 重命名后的会话名称
   */
  Mono<String> renameConversation(String conversationId, String userId, ConversationRenameRequest request);

  /**
   * 删除会话。
   *
   * @param conversationId 会话 ID
   * @param userId         终端用户标识（Dify 要求请求体携带；为空时传 {}）
   * @return 空响应（HTTP 204）
   */
  Mono<Void> deleteConversation(String conversationId, String userId);
}

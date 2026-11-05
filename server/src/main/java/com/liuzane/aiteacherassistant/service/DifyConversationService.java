package com.liuzane.aiteacherassistant.service;

import com.liuzane.aiteacherassistant.model.dto.response.ConversationMessageResponse;
import com.liuzane.aiteacherassistant.model.dto.response.ConversationListResponse;

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
}

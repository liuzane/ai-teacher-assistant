package com.liuzane.aiteacherassistant.service;

import reactor.core.publisher.Flux;

public interface DifyChatService {

  /**
   * 发送消息到 Dify 聊天应用（流式模式）
   *
   * @param query          用户输入
   * @param userId         用户标识（用于 Dify 区分会话归属）
   * @param conversationId Dify 会话 ID，首条消息传 null 开启新会话
   * @return Dify 流式事件数据（每条为事件 JSON 字符串）
   */
  Flux<String> sendMessageStream(String query, String userId, String conversationId);
}

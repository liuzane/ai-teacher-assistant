package com.liuzane.aiteachingassistant.service;

import com.liuzane.aiteachingassistant.model.dto.response.WorkflowRunDetailResponse;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

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

  /**
   * 查询工作流执行情况（对应 Dify GET /workflows/run/{workflow_run_id}）。
   * workflowRunId 从 Redis（key: dify:workflow:{conversationId}）中按会话反查获取。
   *
   * @param conversationId Dify 会话 ID
   * @return 工作流运行详情
   */
  Mono<WorkflowRunDetailResponse> getWorkflowRunDetail(String conversationId);

  /**
   * 停止对话消息生成（对应 Dify POST /chat-messages/{task_id}/stop）。
   * taskId 从 Redis（key: dify:workflow:{conversationId}）中按会话反查获取。
   * 仅支持 streaming 模式。
   *
   * @param conversationId Dify 会话 ID
   * @param userId         终端用户标识，需与发送原始消息时的 user 一致
   * @return 操作结果（固定为 success）
   */
  Mono<String> stopChatMessage(String conversationId, String userId);
}

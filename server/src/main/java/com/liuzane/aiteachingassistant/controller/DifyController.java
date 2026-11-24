package com.liuzane.aiteachingassistant.controller;

import com.liuzane.aiteachingassistant.common.Result;
import com.liuzane.aiteachingassistant.enums.ResultCodeEnum;
import com.liuzane.aiteachingassistant.model.dto.request.ConversationRenameRequest;
import com.liuzane.aiteachingassistant.model.dto.response.ConversationListResponse;
import com.liuzane.aiteachingassistant.model.dto.response.ConversationMessageResponse;
import com.liuzane.aiteachingassistant.model.dto.response.WorkflowRunDetailResponse;
import com.liuzane.aiteachingassistant.service.DifyChatService;
import com.liuzane.aiteachingassistant.service.DifyConversationService;
import com.liuzane.aiteachingassistant.utils.ToolsUtil;

import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequiredArgsConstructor
@RequestMapping("/dify")
public class DifyController {

  private final DifyChatService difyChatService;
  private final DifyConversationService difyConversationService;

  /**
   * 发送对话消息（对应 Dify POST /chat-messages）
   */
  @GetMapping(value = "/chat-messages", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> messages(
    @AuthenticationPrincipal String userInfoStr,
    @RequestParam String query,
    @RequestParam(required = false) String conversationId) {
    return difyChatService.sendMessageStream(query, ToolsUtil.extractUserId(userInfoStr), conversationId)
        .map(data -> ServerSentEvent.builder(data).build());
  }

  /**
   * 停止对话消息生成（对应 Dify POST /chat-messages/{task_id}/stop），仅支持 streaming 模式。
   * 前端仅需传 conversationId，taskId 由后端从 Redis 按会话反查；user 取自当前登录用户。
   */
  @PostMapping("/chat-messages/stop")
  public Mono<Result<String>> stopChatMessage(
    @AuthenticationPrincipal String userInfoStr,
    @RequestParam String conversationId) {
    return difyChatService.stopChatMessage(conversationId, ToolsUtil.extractUserId(userInfoStr))
        .map(Result::<String>success)
        .onErrorResume(e -> Mono.just(Result.fail(ResultCodeEnum.FAILURE.getCode(), e.getMessage())));
  }

  /**
   * 查询工作流执行情况（对应 Dify GET /workflows/run/{workflow_run_id}）。
   * 前端仅需传 conversationId，workflowRunId 由后端从 Redis 按会话反查。
   */
  @GetMapping("/workflows/run/detail")
  public Mono<Result<WorkflowRunDetailResponse>> getWorkflowRunDetail(
    @AuthenticationPrincipal String userInfoStr,
    @RequestParam String conversationId) {
    return difyChatService.getWorkflowRunDetail(conversationId)
        .map(Result::<WorkflowRunDetailResponse>success)
        .onErrorResume(e -> Mono.just(Result.fail(ResultCodeEnum.FAILURE.getCode(), e.getMessage())));
  }

  /**
   * 获取会话列表（对应 Dify GET /conversations）
   */
  @GetMapping("/conversations")
  public Mono<Result<ConversationListResponse>> conversations(
    @AuthenticationPrincipal String userInfoStr,
    @RequestParam(required = false) String lastId,
    @RequestParam(defaultValue = "20") Integer limit,
    @RequestParam(defaultValue = "-updated_at") String sortBy) {
    return difyConversationService.getConversations(ToolsUtil.extractUserId(userInfoStr), lastId, limit, sortBy)
        .map(data -> Result.<ConversationListResponse>success(data));
  }

  /**
   * 获取会话历史消息（对应 Dify GET /messages）
   */
  @GetMapping("/messages")
  public Mono<Result<ConversationMessageResponse>> messages(
    @AuthenticationPrincipal String userInfoStr,
    @RequestParam String conversationId,
    @RequestParam(required = false) String firstId,
    @RequestParam(defaultValue = "20") Integer limit) {
    return difyConversationService.getMessages(conversationId, ToolsUtil.extractUserId(userInfoStr), firstId, limit)
        .map(data -> Result.<ConversationMessageResponse>success(data));
  }

  /**
   * 重命名会话（对应 Dify POST /conversations/{conversation_id}/name）
   */
  @PostMapping("/conversations/{conversationId}/name")
  public Mono<Result<String>> renameConversation(
    @AuthenticationPrincipal String userInfoStr,
    @PathVariable String conversationId,
    @RequestBody ConversationRenameRequest request) {
    return difyConversationService.renameConversation(conversationId, ToolsUtil.extractUserId(userInfoStr), request)
        .map(data -> Result.<String>success(data));
  }

  /**
   * 删除会话（对应 Dify DELETE /conversations/{conversation_id}）
   */
  @DeleteMapping("/conversations/{conversationId}")
  public Mono<Result<Void>> deleteConversation(
    @AuthenticationPrincipal String userInfoStr,
    @PathVariable String conversationId) {
    return difyConversationService.deleteConversation(conversationId, ToolsUtil.extractUserId(userInfoStr))
        .then(Mono.just(Result.<Void>success(null)));
  }
}

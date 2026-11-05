package com.liuzane.aiteacherassistant.controller;

import com.liuzane.aiteacherassistant.common.Result;
import com.liuzane.aiteacherassistant.model.dto.response.ConversationMessageResponse;
import com.liuzane.aiteacherassistant.model.dto.response.ConversationListResponse;
import com.liuzane.aiteacherassistant.service.DifyChatService;
import com.liuzane.aiteacherassistant.service.DifyConversationService;

import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.GetMapping;
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

  @GetMapping(value = "/chat-messages", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> messages(@RequestParam String query,
                                                  @RequestParam String userId,
                                                  @RequestParam(required = false) String conversationId) {
    return difyChatService.sendMessageStream(query, userId, conversationId)
        .map(data -> ServerSentEvent.builder(data).build());
  }

  @GetMapping("/conversations")
  public Mono<Result<ConversationListResponse>> conversations(
      @RequestParam String userId,
      @RequestParam(required = false) String lastId,
      @RequestParam(defaultValue = "20") Integer limit,
      @RequestParam(defaultValue = "-updated_at") String sortBy) {
    return difyConversationService.getConversations(userId, lastId, limit, sortBy)
        .map(data -> Result.<ConversationListResponse>success(data));
  }

  @GetMapping("/messages")
  public Mono<Result<ConversationMessageResponse>> messages(
      @RequestParam String conversationId,
      @RequestParam(required = false) String userId,
      @RequestParam(required = false) String firstId,
      @RequestParam(defaultValue = "20") Integer limit) {
    return difyConversationService.getMessages(conversationId, userId, firstId, limit)
        .map(data -> Result.<ConversationMessageResponse>success(data));
  }
}

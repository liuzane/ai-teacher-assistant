package com.liuzane.aiteacherassistant.model.dto.response;

import lombok.Data;
import tools.jackson.databind.JsonNode;

/**
 * Dify 会话历史中的单条消息
 */
@Data
public class ConversationMessageItem {
  private String id;
  private String conversationId;
  private String query;
  private String answer;
  private JsonNode messageFiles;
  private JsonNode retrieverResources;
  private JsonNode extraContents;
  private JsonNode feedback;
  private String status;
  private String error;
  private Long createdAt;
  private Integer messageTokens;
  private Integer answerTokens;
}

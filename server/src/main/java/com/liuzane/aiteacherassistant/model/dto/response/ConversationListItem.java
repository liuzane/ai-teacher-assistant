package com.liuzane.aiteacherassistant.model.dto.response;

import lombok.Data;

/**
 * Dify 会话列表中的单个会话
 */
@Data
public class ConversationListItem {
  private String id;
  private String name;
  private String status;
  private Long createdAt;
  private Long updatedAt;
}

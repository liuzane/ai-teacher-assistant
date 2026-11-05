package com.liuzane.aiteacherassistant.model.dto.response;

import java.util.List;

import lombok.Data;

/**
 * Dify 获取会话列表接口的响应
 */
@Data
public class ConversationListResponse {
  private List<ConversationListItem> data;
  private Boolean hasMore;
  private Integer limit;
}

package com.liuzane.aiteacherassistant.model.dto.response;

import java.util.List;

import lombok.Data;

/**
 * Dify 获取会话历史消息接口的响应
 */
@Data
public class ConversationMessageResponse {
  private List<ConversationMessageItem> data;
  private Boolean hasMore;
  private Integer limit;
}

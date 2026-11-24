package com.liuzane.aiteachingassistant.model.dto.request;

import lombok.Data;

/**
 * Dify 重命名会话请求体
 */
@Data
public class ConversationRenameRequest {

  /**
   * 新的会话名称。
   */
  private String name;
}

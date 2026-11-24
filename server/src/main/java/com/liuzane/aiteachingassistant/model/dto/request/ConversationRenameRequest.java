package com.liuzane.aiteachingassistant.model.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

/**
 * Dify 重命名会话请求体
 */
@Data
public class ConversationRenameRequest {

  /**
   * 新的会话名称。除非 {@code autoGenerate} 为 {@code true}，否则必填。
   */
  private String name;

  /**
   * 是否自动生成会话名称。为 {@code true} 时，{@code name} 字段将被忽略。
   */
  @JsonProperty("auto_generate")
  private Boolean autoGenerate;

  /**
   * 终端用户标识，由你的应用定义，需在应用内唯一。
   */
  private String user;
}

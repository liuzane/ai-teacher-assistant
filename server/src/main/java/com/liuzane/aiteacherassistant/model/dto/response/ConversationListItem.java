package com.liuzane.aiteacherassistant.model.dto.response;

import java.util.Map;

import lombok.Data;

/**
 * Dify 会话列表中的单个会话。
 *
 * <p>同时作为重命名会话接口（POST /conversations/{id}/name）的返回体。
 */
@Data
public class ConversationListItem {
  private String id;
  private String name;
  private String status;
  /** 会话介绍 / 开场白 */
  private String introduction;
  /** 会话输入变量 */
  private Map<String, Object> inputs;
  private Long createdAt;
  private Long updatedAt;
}

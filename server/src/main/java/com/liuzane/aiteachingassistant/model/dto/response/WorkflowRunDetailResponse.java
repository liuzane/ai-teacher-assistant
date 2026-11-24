package com.liuzane.aiteachingassistant.model.dto.response;

import lombok.Data;
import tools.jackson.databind.JsonNode;

/**
 * Dify 获取工作流执行情况接口（GET /workflows/run/{workflow_run_id}）的响应。
 * 字段含义参考 Dify 官方文档 WorkflowRunDetailResponse。
 */
@Data
public class WorkflowRunDetailResponse {
  /** 工作流运行 ID */
  private String id;
  /** 工作流 ID */
  private String workflowId;
  /**
   * 执行状态：running 执行中 / succeeded 成功 / failed 失败 /
   * stopped 手动停止 / partial-succeeded 部分成功 / paused 等待人工介入
   */
  private String status;
  /** 工作流输入变量，原始 JSON 字符串，可能为 null */
  private String inputs;
  /** 工作流输出数据，尚无输出时为空对象 */
  private JsonNode outputs;
  /** 工作流失败时的错误消息，可能为 null */
  private String error;
  /** 总耗时（秒），不含暂停时间，可能为 null */
  private Double elapsedTime;
  /** 已执行的工作流总步数 */
  private Integer totalSteps;
  /** 消耗的总令牌数 */
  private Integer totalTokens;
  /** 工作流运行创建时的 Unix 时间戳 */
  private Long createdAt;
  /** 工作流运行结束时的 Unix 时间戳，可能为 null */
  private Long finishedAt;
}

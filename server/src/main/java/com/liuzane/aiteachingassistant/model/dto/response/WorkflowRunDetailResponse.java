package com.liuzane.aiteachingassistant.model.dto.response;

import lombok.Data;

/**
 * Dify 获取工作流执行情况接口（GET /workflows/run/{workflow_run_id}）的响应。
 * 仅保留前端需要的字段。
 */
@Data
public class WorkflowRunDetailResponse {
  /**
   * 执行状态：running 执行中 / succeeded 成功 / failed 失败 /
   * stopped 手动停止 / partial-succeeded 部分成功 / paused 等待人工介入
   */
  private String status;
  /** 工作流失败时的错误消息，可能为 null */
  private String error;
  /** 总耗时（秒），不含暂停时间，可能为 null */
  private Double elapsedTime;
  /** 工作流运行创建时的 Unix 时间戳 */
  private Long createdAt;
  /** 工作流运行结束时的 Unix 时间戳，可能为 null */
  private Long finishedAt;
}

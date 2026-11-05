package com.liuzane.aiteacherassistant.enums;

public enum ResultCodeEnum {
  SUCCESS(200, "操作成功"),
  FAILURE(400, "操作失败"),
  UN_AUTH(401, "未认证"),
  NOT_FOUND(404, "服务未找到"),
  ERROR(500, "服务异常");

  private final Integer code;
  private final String msg;

  ResultCodeEnum(Integer code, String msg) {
    this.code = code;
    this.msg = msg;
  }

  public Integer getCode() {
    return code;
  }

  public String getMsg() {
    return msg;
  }
}
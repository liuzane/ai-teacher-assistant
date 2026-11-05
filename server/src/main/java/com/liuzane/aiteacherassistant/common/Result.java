package com.liuzane.aiteacherassistant.common;

import com.liuzane.aiteacherassistant.enums.ResultCodeEnum;

import lombok.Data;

@Data
public class Result<T> {
  private Integer code;
  private T data;
  private String msg;

  private Result(int code, T data, String msg) {
    this.code = code;
    this.data = data;
    this.msg = msg;
  }

  public static <T> Result<T> success(T data) {
    return new Result<T>(ResultCodeEnum.SUCCESS.getCode(), data, ResultCodeEnum.SUCCESS.getMsg());
  }

  public static <T> Result<T> success(T data, String msg) {
    return new Result<T>(ResultCodeEnum.SUCCESS.getCode(), data, msg);
  }

  public static <T> Result<T> fail(Integer code, String msg) {
    return new Result<T>(code, null, msg);
  }
}

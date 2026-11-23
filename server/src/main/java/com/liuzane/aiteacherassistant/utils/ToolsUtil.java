package com.liuzane.aiteacherassistant.utils;

public final class ToolsUtil {

  private ToolsUtil() {
  }

  /**
   * 从 JWT subject（格式为 "username:userId"）中解析出 userId
   *
   * @param userInfoStr JWT subject
   * @return userId，格式不合法时返回 null
   */
  public static String extractUserId(String userInfoStr) {
    int separatorIndex = userInfoStr == null ? -1 : userInfoStr.lastIndexOf(':');
    return separatorIndex < 0 ? null : userInfoStr.substring(separatorIndex + 1);
  }
}

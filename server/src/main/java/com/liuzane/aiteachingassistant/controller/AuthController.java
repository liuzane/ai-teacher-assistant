package com.liuzane.aiteachingassistant.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.liuzane.aiteachingassistant.common.Result;

import com.liuzane.aiteachingassistant.service.AuthService;
import com.liuzane.aiteachingassistant.model.dto.request.LoginRequest;
import com.liuzane.aiteachingassistant.model.dto.request.RefreshRequest;
import com.liuzane.aiteachingassistant.model.dto.response.LoginResponse;
import com.liuzane.aiteachingassistant.model.dto.response.RefreshResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthController {
  private final AuthService authService;

  /**
   * 用户登录
   */
  @PostMapping("/login")
  public Result<LoginResponse> login(@RequestBody LoginRequest request) {
    return authService.login(request);
  }

  /**
   * 刷新访问令牌
   */
  @PostMapping("/refresh")
  public Result<RefreshResponse> refresh(@RequestBody RefreshRequest request) {
    return authService.refresh(request);
  }
}

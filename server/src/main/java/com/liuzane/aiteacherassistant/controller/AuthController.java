package com.liuzane.aiteacherassistant.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.liuzane.aiteacherassistant.common.Result;

import com.liuzane.aiteacherassistant.service.AuthService;
import com.liuzane.aiteacherassistant.model.dto.request.LoginRequest;
import com.liuzane.aiteacherassistant.model.dto.request.RefreshRequest;
import com.liuzane.aiteacherassistant.model.dto.response.LoginResponse;
import com.liuzane.aiteacherassistant.model.dto.response.RefreshResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthController {
  private final AuthService authService;

  @PostMapping("/login")
  public Result<LoginResponse> login(@RequestBody LoginRequest request) {
    return authService.login(request);
  }

  @PostMapping("/refresh")
  public Result<RefreshResponse> refresh(@RequestBody RefreshRequest request) {
    return authService.refresh(request);
  }
}

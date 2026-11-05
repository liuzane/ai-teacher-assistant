package com.liuzane.aiteacherassistant.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import com.liuzane.aiteacherassistant.common.Result;
import com.liuzane.aiteacherassistant.service.UserService;
import com.liuzane.aiteacherassistant.model.vo.UserInfoVO;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/user")
public class UserController {

  private final UserService service;

  @GetMapping("/info")
  public Result<UserInfoVO> getUserInfo(@AuthenticationPrincipal String username) {
    return service.getUserInfo(username);
  }
}
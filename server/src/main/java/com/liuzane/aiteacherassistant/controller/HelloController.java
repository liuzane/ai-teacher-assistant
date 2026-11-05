package com.liuzane.aiteacherassistant.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import com.liuzane.aiteacherassistant.common.Result;
import com.liuzane.aiteacherassistant.service.HelloService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/hello")
public class HelloController {

  private final HelloService service;

  @GetMapping("/teacher")
  public Result<String> teacher(@AuthenticationPrincipal String username) {
    return service.teacher(username);
  }
}

package com.liuzane.aiteacherassistant.service.impl;

import org.springframework.stereotype.Service;

import com.liuzane.aiteacherassistant.common.Result;
import com.liuzane.aiteacherassistant.service.HelloService;

@Service
public class HelloServiceImpl implements HelloService {
  @Override
  public Result<String> teacher(String username) {
    return Result.success("Hello Teacher, " + username);
  }
}

package com.liuzane.aiteacherassistant.service;

import org.springframework.stereotype.Service;
import com.liuzane.aiteacherassistant.common.Result;

@Service
public interface HelloService {
  public Result<String> teacher(String username);
}

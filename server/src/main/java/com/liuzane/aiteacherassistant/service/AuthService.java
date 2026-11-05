package com.liuzane.aiteacherassistant.service;

import com.liuzane.aiteacherassistant.common.Result;
import org.springframework.stereotype.Service;
import com.liuzane.aiteacherassistant.model.dto.request.LoginRequest;
import com.liuzane.aiteacherassistant.model.dto.request.RefreshRequest;
import com.liuzane.aiteacherassistant.model.dto.response.LoginResponse;
import com.liuzane.aiteacherassistant.model.dto.response.RefreshResponse;

@Service
public interface AuthService {
  public Result<LoginResponse> login(LoginRequest request);
  public Result<RefreshResponse> refresh(RefreshRequest request);
}

package com.liuzane.aiteachingassistant.service;

import com.liuzane.aiteachingassistant.common.Result;
import org.springframework.stereotype.Service;
import com.liuzane.aiteachingassistant.model.dto.request.LoginRequest;
import com.liuzane.aiteachingassistant.model.dto.request.RefreshRequest;
import com.liuzane.aiteachingassistant.model.dto.response.LoginResponse;
import com.liuzane.aiteachingassistant.model.dto.response.RefreshResponse;

@Service
public interface AuthService {
  public Result<LoginResponse> login(LoginRequest request);
  public Result<RefreshResponse> refresh(RefreshRequest request);
}

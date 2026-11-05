package com.liuzane.aiteacherassistant.service.impl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.liuzane.aiteacherassistant.common.Result;
import com.liuzane.aiteacherassistant.mapper.UserMapper;
import com.liuzane.aiteacherassistant.model.entity.User;
import com.liuzane.aiteacherassistant.service.AuthService;
import com.liuzane.aiteacherassistant.utils.JwtUtil;
import com.liuzane.aiteacherassistant.model.dto.request.LoginRequest;
import com.liuzane.aiteacherassistant.model.dto.request.RefreshRequest;
import com.liuzane.aiteacherassistant.model.dto.response.LoginResponse;
import com.liuzane.aiteacherassistant.model.dto.response.RefreshResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthServiceServiceImpl implements AuthService {
  @Autowired
  private final UserMapper userMapper;

  @Autowired
  private final JwtUtil jwtUtil;

  @Override
  public Result<LoginResponse> login(LoginRequest request) {
    // 1. 根据用户名查询 user 表
    User user = userMapper.selectOne(
      new LambdaQueryWrapper<User>().eq(User::getUsername, request.getUsername())
    );

    System.out.println("Login user: " + user);
    if (user == null) {
      return Result.fail(HttpStatus.UNAUTHORIZED.value(), "用户不存在");
    }

    // 2. 校验密码
    if (!user.getPassword().equals(request.getPassword())) {
      return Result.fail(HttpStatus.UNAUTHORIZED.value(), "密码错误");
    }

    // 3. 生成双 Token
    final String accessToken = jwtUtil.generateAccessToken(user.getUsername());
    final String refreshToken = jwtUtil.generateRefreshToken(user.getUsername());

    // 4. 返回给前端
    return Result.success(new LoginResponse(accessToken, refreshToken));
  }

  /**
   * 刷新 Token 接口
   * @param request 包含 Refresh Token 的请求
   * @return 包含新的 Access Token 的响应
   */
  @Override
  public Result<RefreshResponse> refresh(RefreshRequest request) {
    String refreshToken = request.getRefreshToken();
    // 1. 验证 Refresh Token 是否有效
    if (!jwtUtil.validateToken(refreshToken)) {
      return Result.fail(HttpStatus.UNAUTHORIZED.value(), "Invalid refresh token");
    }

    // 2. 提取用户名，生成新的 Access Token
    String username = jwtUtil.extractUsername(refreshToken);
    final String newAccessToken = jwtUtil.generateAccessToken(username);

    // 3. 返回新的 Access Token（也可选择同时返回新的 Refresh Token）
    return Result.success(new RefreshResponse(newAccessToken));
  }
}

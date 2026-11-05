package com.liuzane.aiteacherassistant.filter;

import com.liuzane.aiteacherassistant.enums.ResultCodeEnum;
import com.liuzane.aiteacherassistant.utils.JwtUtil;
import com.liuzane.aiteacherassistant.common.Result;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
  @Autowired
  private JwtUtil jwtUtil;

  @Autowired
  private ObjectMapper objectMapper;

  private static final List<String> WHITE_LIST = List.of(
    "/auth/login",
    "/auth/refresh"
  );

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getServletPath();
    return WHITE_LIST.stream().anyMatch(path::startsWith);
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
    final String authHeader = request.getHeader("Authorization");

    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      writeError(response, ResultCodeEnum.UN_AUTH);
      return;
    }

    String accessToken = authHeader.substring(7);
    
    if (!jwtUtil.validateToken(accessToken)) {
      writeError(response, ResultCodeEnum.UN_AUTH);
      return;
    }

    String username = jwtUtil.extractUsername(accessToken);
    if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
      UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
        username,
        null,
        AuthorityUtils.NO_AUTHORITIES
      );
      SecurityContextHolder.getContext().setAuthentication(authentication);
    }
    chain.doFilter(request, response);
  }

  private void writeError(HttpServletResponse response, ResultCodeEnum codeEnum) throws IOException {
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);          // HTTP 状态码
    response.setContentType("application/json;charset=UTF-8");
    response.setCharacterEncoding("UTF-8");

    Result<Void> result = Result.fail(codeEnum.getCode(), codeEnum.getMsg());
    response.getWriter().write(objectMapper.writeValueAsString(result));
  }
}

package com.liuzane.aiteacherassistant.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import com.liuzane.aiteacherassistant.filter.JwtAuthenticationFilter;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
  @Autowired
  private JwtAuthenticationFilter jwtAuthenticationFilter;

  @Bean // 给 Spring Security 使用
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.disable())
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            // 关键：异步派发、错误页派发、转发派发不再重复授权
            .dispatcherTypeMatchers(
                DispatcherType.ASYNC,
                DispatcherType.ERROR,
                DispatcherType.FORWARD)
            .permitAll()
            .requestMatchers("/auth/login", "/auth/refresh", "/error").permitAll()
            .anyRequest().authenticated())
        .exceptionHandling(ex -> ex
            .authenticationEntryPoint((request, response, authException) -> {
              if (!response.isCommitted()) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
              }
            })
            .accessDeniedHandler((request, response, accessDeniedException) -> {
              if (!response.isCommitted()) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Forbidden");
              }
            }))
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
  }

  /**
   * 关键：阻止 Spring Boot 把 JwtAuthenticationFilter 自动注册到 Servlet 容器
   * 否则它会执行两次（Servlet 容器一次 + Spring Security 链一次）
   */
  @Bean // 给 Spring Boot Servlet 容器使用
  public FilterRegistrationBean<JwtAuthenticationFilter> jwtFilterRegistration(JwtAuthenticationFilter filter) {
    FilterRegistrationBean<JwtAuthenticationFilter> registration = new FilterRegistrationBean<>(filter);
    registration.setEnabled(false);
    return registration;
  }

  @Bean // 给业务代码注入使用
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }
}
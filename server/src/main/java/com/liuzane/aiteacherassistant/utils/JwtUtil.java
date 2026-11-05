package com.liuzane.aiteacherassistant.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {
  private String secretKey = "ed4db94aa3c2c83bd47f3bf683c09ae47ecb5b9a1e70c284833155952d79163b";

  private Long accessExpiration = 3600000L; // 3600000 (1小时)

  private Long refreshExpiration = 604800000L; // 604800000 (7天)

  // 生成 Access Token
  public String generateAccessToken(String username) {
    return generateToken(username, accessExpiration);
  }

  // 生成 Refresh Token
  public String generateRefreshToken(String username) {
    return generateToken(username, refreshExpiration);
  }

  // 通用生成方法
  private String generateToken(String username, Long expiration) {
    return Jwts.builder()
        .setSubject(username)
        .setIssuedAt(new Date())
        .setExpiration(new Date(System.currentTimeMillis() + expiration))
        .signWith(getSigningKey(), SignatureAlgorithm.HS256)
        .compact();
  }

  // 获取签名密钥
  private Key getSigningKey() {
    byte[] keyBytes = Decoders.BASE64.decode(secretKey);
    return Keys.hmacShaKeyFor(keyBytes);
  }

  // 从 Token 中提取用户名
  public String extractUsername(String token) {
    return extractAllClaims(token).getSubject();
  }

  // 提取所有声明
  private Claims extractAllClaims(String token) {
    return Jwts.parserBuilder()
        .setSigningKey(getSigningKey())
        .build()
        .parseClaimsJws(token)
        .getBody();
  }

  // 验证 Token 是否有效（未过期且格式正确）
  public boolean validateToken(String token) {
    try {
      extractAllClaims(token);
      return true;
    } catch (ExpiredJwtException | MalformedJwtException | SignatureException e) {
      // 这里可以记录日志
      return false;
    }
  }

  // 检查 Token 是否过期
  public boolean isTokenExpired(String token) {
    return extractAllClaims(token).getExpiration().before(new Date());
  }
}
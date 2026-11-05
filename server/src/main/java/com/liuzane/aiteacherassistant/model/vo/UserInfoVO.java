package com.liuzane.aiteacherassistant.model.vo;

import lombok.Data;

@Data
public class UserInfoVO {
  private String id;
  private String username;
  private String email;
  private String role;
  private String phone;
  private String[] menus;
}

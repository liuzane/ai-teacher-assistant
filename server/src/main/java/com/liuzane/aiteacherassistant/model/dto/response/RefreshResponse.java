package com.liuzane.aiteacherassistant.model.dto.response;

import lombok.Data;

@Data
public class RefreshResponse {
  private String accessToken;

  public RefreshResponse(String accessToken) {
    this.accessToken = accessToken;
  }
}

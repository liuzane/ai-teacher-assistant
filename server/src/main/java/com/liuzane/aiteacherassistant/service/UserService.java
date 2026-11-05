package com.liuzane.aiteacherassistant.service;

import org.springframework.stereotype.Service;
import com.liuzane.aiteacherassistant.common.Result;
import com.liuzane.aiteacherassistant.model.vo.UserInfoVO;

@Service
public interface UserService {
  public Result<UserInfoVO> getUserInfo(String username);
}

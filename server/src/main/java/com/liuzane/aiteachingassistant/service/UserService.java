package com.liuzane.aiteachingassistant.service;

import org.springframework.stereotype.Service;
import com.liuzane.aiteachingassistant.common.Result;
import com.liuzane.aiteachingassistant.model.vo.UserInfoVO;

@Service
public interface UserService {
  public Result<UserInfoVO> getUserInfo(String username);
}

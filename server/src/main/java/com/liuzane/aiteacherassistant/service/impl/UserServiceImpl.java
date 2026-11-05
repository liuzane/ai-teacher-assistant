package com.liuzane.aiteacherassistant.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.liuzane.aiteacherassistant.common.Result;
import com.liuzane.aiteacherassistant.mapper.UserMapper;
import com.liuzane.aiteacherassistant.model.entity.User;
import com.liuzane.aiteacherassistant.model.vo.UserInfoVO;
import com.liuzane.aiteacherassistant.service.UserService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
  @Autowired
  private final UserMapper userMapper;

  @Override
  public Result<UserInfoVO> getUserInfo(String username) {
    User user = userMapper.selectOne(
      new LambdaQueryWrapper<User>().eq(User::getUsername, username)
    );
    if (user == null) {
      return Result.fail(HttpStatus.BAD_REQUEST.value(), "用户不存在");
    }
    UserInfoVO vo = new UserInfoVO();
    vo.setId(user.getId().toString());
    vo.setUsername(username);
    vo.setEmail(user.getEmail());
    vo.setRole("");
    return Result.success(vo);
  }
}

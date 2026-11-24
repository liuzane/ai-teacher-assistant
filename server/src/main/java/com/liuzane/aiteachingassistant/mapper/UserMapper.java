package com.liuzane.aiteachingassistant.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

import com.liuzane.aiteachingassistant.model.entity.User;


@Mapper
public interface UserMapper extends BaseMapper<User> {

}

package com.liuzane.aiteacherassistant.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("user")
public class User {

  @TableId(type = IdType.AUTO)
  private Integer id;

  private String username;

  private String email;

  private String password;

  @TableField("createTime")
  private LocalDateTime createTime;

  @TableField("updateTime")
  private LocalDateTime updateTime;
}

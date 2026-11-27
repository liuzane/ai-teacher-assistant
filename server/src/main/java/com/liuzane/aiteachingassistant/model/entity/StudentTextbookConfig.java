package com.liuzane.aiteachingassistant.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("student_textbook_config")
public class StudentTextbookConfig {

  @TableId(type = IdType.AUTO)
  private Integer id;

  /** 年级：1-12，分别对应小学到高中 */
  private Integer grade;

  /** 语文教材版本，如统编版 */
  @TableField("chinese_textbook_version")
  private String chineseTextbookVersion;

  /** 英语教材版本，如人教版、外研版 */
  @TableField("english_textbook_version")
  private String englishTextbookVersion;

  @TableField("createTime")
  private LocalDateTime createTime;

  @TableField("updateTime")
  private LocalDateTime updateTime;
}

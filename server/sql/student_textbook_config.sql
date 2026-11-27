-- Database export: ai_teaching_assistant
-- Date: 2026-11-27 18:30:00
-- Table: student_textbook_config

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `student_textbook_config`;

CREATE TABLE `student_textbook_config` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `grade` tinyint unsigned NOT NULL COMMENT '年级：1-12，分别对应小学到高中',
  `chinese_textbook_version` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '语文教材版本，如统编版',
  `english_textbook_version` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '英语教材版本，如人教版、外研版',
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生教材配置表';

SET FOREIGN_KEY_CHECKS = 1;

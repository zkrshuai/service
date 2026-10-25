-- ============================================================
-- 就业服务信息系统 数据库结构 (MySQL 5.7+ / 8.x)
-- 编码：utf8mb4
-- ============================================================
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS employment_system
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE employment_system;

-- 用户表
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '登录用户名',
  password VARCHAR(100) NOT NULL COMMENT 'bcrypt 加密密码',
  role ENUM('seeker','employer','admin') NOT NULL DEFAULT 'seeker' COMMENT '角色',
  name VARCHAR(50) COMMENT '姓名/联系人',
  email VARCHAR(100),
  phone VARCHAR(20),
  status ENUM('active','disabled') NOT NULL DEFAULT 'active' COMMENT '账号状态',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_role (role)
) ENGINE=InnoDB COMMENT='用户表';

-- 企业表
DROP TABLE IF EXISTS companies;
CREATE TABLE companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL COMMENT '企业名称',
  city VARCHAR(50),
  industry VARCHAR(50),
  scale VARCHAR(50) COMMENT '公司规模',
  description TEXT,
  created_by INT COMMENT '创建人(企业用户)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_company_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB COMMENT='企业表';

-- 简历表
DROP TABLE IF EXISTS resumes;
CREATE TABLE resumes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  full_name VARCHAR(50),
  gender VARCHAR(10),
  birth_date DATE,
  city VARCHAR(50),
  phone VARCHAR(20),
  email VARCHAR(100),
  education VARCHAR(20) COMMENT '最高学历',
  work_years VARCHAR(10) DEFAULT '0' COMMENT '工作年限',
  skills VARCHAR(255) COMMENT '技能标签，逗号分隔',
  expectation_position VARCHAR(100) COMMENT '期望职位',
  expectation_city VARCHAR(50) COMMENT '期望城市',
  job_type VARCHAR(20) COMMENT '期望工作性质',
  expectation_salary_min INT COMMENT '期望薪资下限(K)',
  expectation_salary_max INT COMMENT '期望薪资上限(K)',
  self_intro TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_resume_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB COMMENT='求职者简历';

-- 职位表
DROP TABLE IF EXISTS jobs;
CREATE TABLE jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  created_by INT NOT NULL COMMENT '发布人(企业用户)',
  title VARCHAR(120) NOT NULL,
  city VARCHAR(50),
  industry VARCHAR(50),
  job_type VARCHAR(20) DEFAULT '全职',
  salary_min INT COMMENT '薪资下限(K)',
  salary_max INT COMMENT '薪资上限(K)',
  education_required VARCHAR(20) DEFAULT '不限',
  experience_required VARCHAR(20) DEFAULT '不限',
  skills VARCHAR(255) COMMENT '技能要求，逗号分隔',
  description TEXT COMMENT '职位描述',
  requirements TEXT COMMENT '任职要求',
  status ENUM('pending','published','closed','rejected') NOT NULL DEFAULT 'pending' COMMENT '审核/上下线状态',
  view_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_status (status),
  KEY idx_company (company_id),
  CONSTRAINT fk_job_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_job_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB COMMENT='职位表';

-- 投递/招聘流程记录表
DROP TABLE IF EXISTS job_applications;
CREATE TABLE job_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  seeker_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'applied' COMMENT '流程阶段',
  result VARCHAR(20) DEFAULT 'pending' COMMENT '最终结果',
  result_reason VARCHAR(255) COMMENT '结果说明',
  note VARCHAR(255) COMMENT '企业备注',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_apply (job_id, seeker_id),
  KEY idx_seeker (seeker_id),
  CONSTRAINT fk_apply_job FOREIGN KEY (job_id) REFERENCES jobs(id),
  CONSTRAINT fk_apply_seeker FOREIGN KEY (seeker_id) REFERENCES users(id)
) ENGINE=InnoDB COMMENT='投递与招聘流程追踪';

-- 面试邀请表
DROP TABLE IF EXISTS interview_invitations;
CREATE TABLE interview_invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  seeker_id INT NOT NULL,
  employer_id INT NOT NULL,
  message VARCHAR(500) COMMENT '邀请说明',
  invite_time DATETIME COMMENT '面试时间',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/accepted/declined/expired',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inv_job FOREIGN KEY (job_id) REFERENCES jobs(id),
  CONSTRAINT fk_inv_seeker FOREIGN KEY (seeker_id) REFERENCES users(id),
  CONSTRAINT fk_inv_employer FOREIGN KEY (employer_id) REFERENCES users(id)
) ENGINE=InnoDB COMMENT='面试邀请';

-- 收藏表
DROP TABLE IF EXISTS favorites;
CREATE TABLE favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  job_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_fav (user_id, job_id),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_fav_job FOREIGN KEY (job_id) REFERENCES jobs(id)
) ENGINE=InnoDB COMMENT='职位收藏';

-- 通知表
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(30) COMMENT '通知类型',
  title VARCHAR(120),
  content VARCHAR(500),
  is_read TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user (user_id),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB COMMENT='站内通知';

-- 招聘流程操作留痕表
DROP TABLE IF EXISTS recruitment_logs;
CREATE TABLE recruitment_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  stage VARCHAR(20) COMMENT '到达阶段',
  note VARCHAR(255),
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_log_apply FOREIGN KEY (application_id) REFERENCES job_applications(id)
) ENGINE=InnoDB COMMENT='招聘流程操作日志';

SET FOREIGN_KEY_CHECKS = 1;

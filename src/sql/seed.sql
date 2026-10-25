-- ============================================================
-- 就业服务信息系统 演示数据 (由 init-db.js 自动生成)
-- 所有账号密码：123456
-- ============================================================
USE employment_system;

INSERT INTO users (username, password, role, name, email, phone) VALUES ('admin', '$2a$10$pBp/PbXvFWLrQ0KEPS.vzu6vLj5sEt3xnYRxC.cyYu/kkeo1bobuC', 'admin', '系统管理员', 'admin@eis.local', NULL);
INSERT INTO users (username, password, role, name, email, phone) VALUES ('zhangsan', '$2a$10$pBp/PbXvFWLrQ0KEPS.vzu6vLj5sEt3xnYRxC.cyYu/kkeo1bobuC', 'seeker', '张三', 'zhangsan@example.com', '13800000001');
INSERT INTO users (username, password, role, name, email, phone) VALUES ('lisi', '$2a$10$pBp/PbXvFWLrQ0KEPS.vzu6vLj5sEt3xnYRxC.cyYu/kkeo1bobuC', 'seeker', '李四', 'lisi@example.com', '13800000002');
INSERT INTO users (username, password, role, name, email, phone) VALUES ('wangwu', '$2a$10$pBp/PbXvFWLrQ0KEPS.vzu6vLj5sEt3xnYRxC.cyYu/kkeo1bobuC', 'seeker', '王五', 'wangwu@example.com', '13800000003');
INSERT INTO users (username, password, role, name, email, phone) VALUES ('tech_hr', '$2a$10$pBp/PbXvFWLrQ0KEPS.vzu6vLj5sEt3xnYRxC.cyYu/kkeo1bobuC', 'employer', '刘经理', 'hr@yunqi.com', '13900000001');
INSERT INTO users (username, password, role, name, email, phone) VALUES ('fin_hr', '$2a$10$pBp/PbXvFWLrQ0KEPS.vzu6vLj5sEt3xnYRxC.cyYu/kkeo1bobuC', 'employer', '陈经理', 'hr@hengxin.com', '13900000002');
INSERT INTO companies (name, city, industry, scale, created_by) VALUES ('云启科技有限公司', '北京', '互联网', '500-2000人', 5);
INSERT INTO companies (name, city, industry, scale, created_by) VALUES ('恒信金融服务', '上海', '金融', '200-500人', 6);
INSERT INTO resumes (user_id, full_name, gender, city, phone, email, education, work_years, skills, expectation_position, expectation_city, job_type, expectation_salary_min, expectation_salary_max, self_intro) VALUES (2, '张三', '男', '北京', '13800000001', 'zhangsan@example.com', '本科', '3', 'Vue,Node.js,MySQL,JavaScript', '前端开发工程师', '北京', '全职', 15, 25, '3 年前端开发经验，熟悉 Vue 与 Node.js');
INSERT INTO resumes (user_id, full_name, gender, city, phone, email, education, work_years, skills, expectation_position, expectation_city, job_type, expectation_salary_min, expectation_salary_max, self_intro) VALUES (3, '李四', '女', '上海', '13800000002', 'lisi@example.com', '硕士', '2', 'Python,Django,数据分析,MySQL', '数据分析师', '上海', '全职', 18, 28, '硕士学历，擅长数据分析与后端开发');
INSERT INTO resumes (user_id, full_name, gender, city, phone, email, education, work_years, skills, expectation_position, expectation_city, job_type, expectation_salary_min, expectation_salary_max, self_intro) VALUES (4, '王五', '男', '北京', '13800000003', 'wangwu@example.com', '本科', '5', 'Java,Spring,MySQL,微服务', 'Java开发工程师', '北京', '全职', 20, 35, '5 年后端开发经验，熟悉 Java 技术栈');
INSERT INTO jobs (company_id, created_by, title, city, industry, job_type, salary_min, salary_max, education_required, experience_required, skills, description, requirements, status) VALUES (1, 5, '前端开发工程师', '北京', '互联网', '全职', 15, 25, '本科', '1-3年', 'Vue,JavaScript,TypeScript', '负责公司核心产品的前端开发与维护。', '熟悉 Vue 3，了解 Node.js 优先。', 'published');
INSERT INTO jobs (company_id, created_by, title, city, industry, job_type, salary_min, salary_max, education_required, experience_required, skills, description, requirements, status) VALUES (1, 5, 'Node.js 后端工程师', '北京', '互联网', '全职', 18, 30, '本科', '3-5年', 'Node.js,MySQL,Express', '负责后端服务设计与开发。', '熟悉 Node.js 与 MySQL。', 'published');
INSERT INTO jobs (company_id, created_by, title, city, industry, job_type, salary_min, salary_max, education_required, experience_required, skills, description, requirements, status) VALUES (1, 5, '前端开发实习生', '北京', '互联网', '实习', 3, 5, '大专', '不限', 'Vue,HTML,CSS', '协助前端团队完成页面开发。', '在校生，熟悉前端基础。', 'published');
INSERT INTO jobs (company_id, created_by, title, city, industry, job_type, salary_min, salary_max, education_required, experience_required, skills, description, requirements, status) VALUES (2, 6, '数据分析师', '上海', '金融', '全职', 18, 30, '硕士', '1-3年', 'Python,数据分析,SQL', '负责金融业务数据分析与建模。', '硕士学历，熟悉 Python 与 SQL。', 'published');
INSERT INTO jobs (company_id, created_by, title, city, industry, job_type, salary_min, salary_max, education_required, experience_required, skills, description, requirements, status) VALUES (2, 6, 'Java 开发工程师', '上海', '金融', '全职', 20, 35, '本科', '3-5年', 'Java,Spring,MySQL', '负责核心交易系统开发。', '熟悉 Java、Spring 技术栈。', 'pending');
INSERT INTO job_applications (job_id, seeker_id, status, result) VALUES (1, 2, 'interview', 'pending');
INSERT INTO job_applications (job_id, seeker_id, status, result) VALUES (2, 3, 'applied', 'pending');
INSERT IGNORE INTO favorites (user_id, job_id) VALUES (2, 2);
INSERT INTO interview_invitations (job_id, seeker_id, employer_id, message, status) VALUES (1, 4, 5, '诚邀您参加前端开发工程师职位面试。', 'pending');
INSERT INTO notifications (user_id, type, title, content) VALUES (2, 'stage', '招聘流程更新', '你投递的「前端开发工程师」已进入「面试进行中」');

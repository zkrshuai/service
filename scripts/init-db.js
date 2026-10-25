/**
 * 数据库初始化脚本
 * 用法：npm run init-db
 * 作用：
 *   1) 执行 src/sql/schema.sql 创建数据库与全部表
 *   2) 写入演示数据（默认密码均为 123456）
 *   3) 生成一份可复用的 src/sql/seed.sql 供手动导入
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const schemaPath = path.join(ROOT, 'src', 'sql', 'schema.sql')
const seedPath = path.join(ROOT, 'src', 'sql', 'seed.sql')

const CFG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'employment_system',
  multipleStatements: true
}

const password = '123456'

async function main() {
  // 1. 建库
  const conn = await mysql.createConnection({ ...CFG, database: undefined })
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${CFG.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  await conn.changeUser({ database: CFG.database })

  // 2. 建表
  const schema = fs.readFileSync(schemaPath, 'utf8')
  await conn.query(schema)
  console.log('[init] 表结构已创建')

  // 3. 演示数据
  const hash = await bcrypt.hash(password, 10)
  const lines = []
  const Q = (sql) => lines.push(sql)

  // 用户
  const users = [
    { username: 'admin', role: 'admin', name: '系统管理员', email: 'admin@eis.local' },
    { username: 'zhangsan', role: 'seeker', name: '张三', email: 'zhangsan@example.com', phone: '13800000001' },
    { username: 'lisi', role: 'seeker', name: '李四', email: 'lisi@example.com', phone: '13800000002' },
    { username: 'wangwu', role: 'seeker', name: '王五', email: 'wangwu@example.com', phone: '13800000003' },
    { username: 'tech_hr', role: 'employer', name: '刘经理', email: 'hr@yunqi.com', phone: '13900000001' },
    { username: 'fin_hr', role: 'employer', name: '陈经理', email: 'hr@hengxin.com', phone: '13900000002' }
  ]
  const userIds = {}
  for (const u of users) {
    await conn.query(
      'INSERT INTO users (username, password, role, name, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [u.username, hash, u.role, u.name, u.email, u.phone || null]
    )
    const [rows] = await conn.query('SELECT id FROM users WHERE username = ?', [u.username])
    userIds[u.username] = rows[0].id
    Q(`INSERT INTO users (username, password, role, name, email, phone) VALUES ('${u.username}', '${hash}', '${u.role}', '${u.name}', '${u.email}', ${u.phone ? `'${u.phone}'` : 'NULL'});`)
  }
  console.log('[init] 演示账号已创建（密码均为 123456）')

  // 企业
  const companies = [
    { name: '云启科技有限公司', city: '北京', industry: '互联网', scale: '500-2000人', created_by: 'tech_hr' },
    { name: '恒信金融服务', city: '上海', industry: '金融', scale: '200-500人', created_by: 'fin_hr' }
  ]
  const companyIds = {}
  for (const c of companies) {
    const r = await conn.query(
      'INSERT INTO companies (name, city, industry, scale, created_by) VALUES (?, ?, ?, ?, ?)',
      [c.name, c.city, c.industry, c.scale, userIds[c.created_by]]
    )
    companyIds[c.name] = r[0].insertId
    Q(`INSERT INTO companies (name, city, industry, scale, created_by) VALUES ('${c.name}', '${c.city}', '${c.industry}', '${c.scale}', ${userIds[c.created_by]});`)
  }

  // 简历
  const resumes = [
    { user: 'zhangsan', full_name: '张三', gender: '男', city: '北京', phone: '13800000001', email: 'zhangsan@example.com', education: '本科', work_years: '3', skills: 'Vue,Node.js,MySQL,JavaScript', expectation_position: '前端开发工程师', expectation_city: '北京', job_type: '全职', salary_min: 15, salary_max: 25, self_intro: '3 年前端开发经验，熟悉 Vue 与 Node.js' },
    { user: 'lisi', full_name: '李四', gender: '女', city: '上海', phone: '13800000002', email: 'lisi@example.com', education: '硕士', work_years: '2', skills: 'Python,Django,数据分析,MySQL', expectation_position: '数据分析师', expectation_city: '上海', job_type: '全职', salary_min: 18, salary_max: 28, self_intro: '硕士学历，擅长数据分析与后端开发' },
    { user: 'wangwu', full_name: '王五', gender: '男', city: '北京', phone: '13800000003', email: 'wangwu@example.com', education: '本科', work_years: '5', skills: 'Java,Spring,MySQL,微服务', expectation_position: 'Java开发工程师', expectation_city: '北京', job_type: '全职', salary_min: 20, salary_max: 35, self_intro: '5 年后端开发经验，熟悉 Java 技术栈' }
  ]
  for (const r of resumes) {
    await conn.query(
      `INSERT INTO resumes (user_id, full_name, gender, city, phone, email, education, work_years, skills, expectation_position, expectation_city, job_type, expectation_salary_min, expectation_salary_max, self_intro)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userIds[r.user], r.full_name, r.gender, r.city, r.phone, r.email, r.education, r.work_years, r.skills, r.expectation_position, r.expectation_city, r.job_type, r.salary_min, r.salary_max, r.self_intro]
    )
    Q(`INSERT INTO resumes (user_id, full_name, gender, city, phone, email, education, work_years, skills, expectation_position, expectation_city, job_type, expectation_salary_min, expectation_salary_max, self_intro) VALUES (${userIds[r.user]}, '${r.full_name}', '${r.gender}', '${r.city}', '${r.phone}', '${r.email}', '${r.education}', '${r.work_years}', '${r.skills}', '${r.expectation_position}', '${r.expectation_city}', '${r.job_type}', ${r.salary_min}, ${r.salary_max}, '${r.self_intro}');`)
  }

  // 职位（多个已发布以支撑检索与匹配）
  const jobs = [
    { company: '云启科技有限公司', by: 'tech_hr', title: '前端开发工程师', city: '北京', industry: '互联网', job_type: '全职', sMin: 15, sMax: 25, edu: '本科', exp: '1-3年', skills: 'Vue,JavaScript,TypeScript', status: 'published', desc: '负责公司核心产品的前端开发与维护。', req: '熟悉 Vue 3，了解 Node.js 优先。' },
    { company: '云启科技有限公司', by: 'tech_hr', title: 'Node.js 后端工程师', city: '北京', industry: '互联网', job_type: '全职', sMin: 18, sMax: 30, edu: '本科', exp: '3-5年', skills: 'Node.js,MySQL,Express', status: 'published', desc: '负责后端服务设计与开发。', req: '熟悉 Node.js 与 MySQL。' },
    { company: '云启科技有限公司', by: 'tech_hr', title: '前端开发实习生', city: '北京', industry: '互联网', job_type: '实习', sMin: 3, sMax: 5, edu: '大专', exp: '不限', skills: 'Vue,HTML,CSS', status: 'published', desc: '协助前端团队完成页面开发。', req: '在校生，熟悉前端基础。' },
    { company: '恒信金融服务', by: 'fin_hr', title: '数据分析师', city: '上海', industry: '金融', job_type: '全职', sMin: 18, sMax: 30, edu: '硕士', exp: '1-3年', skills: 'Python,数据分析,SQL', status: 'published', desc: '负责金融业务数据分析与建模。', req: '硕士学历，熟悉 Python 与 SQL。' },
    { company: '恒信金融服务', by: 'fin_hr', title: 'Java 开发工程师', city: '上海', industry: '金融', job_type: '全职', sMin: 20, sMax: 35, edu: '本科', exp: '3-5年', skills: 'Java,Spring,MySQL', status: 'pending', desc: '负责核心交易系统开发。', req: '熟悉 Java、Spring 技术栈。' }
  ]
  for (const j of jobs) {
    await conn.query(
      `INSERT INTO jobs (company_id, created_by, title, city, industry, job_type, salary_min, salary_max, education_required, experience_required, skills, description, requirements, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [companyIds[j.company], userIds[j.by], j.title, j.city, j.industry, j.job_type, j.sMin, j.sMax, j.edu, j.exp, j.skills, j.desc, j.req, j.status]
    )
    Q(`INSERT INTO jobs (company_id, created_by, title, city, industry, job_type, salary_min, salary_max, education_required, experience_required, skills, description, requirements, status) VALUES (${companyIds[j.company]}, ${userIds[j.by]}, '${j.title}', '${j.city}', '${j.industry}', '${j.job_type}', ${j.sMin}, ${j.sMax}, '${j.edu}', '${j.exp}', '${j.skills}', '${j.desc}', '${j.req}', '${j.status}');`)
  }
  console.log('[init] 演示职位已创建')

  // 投递（用于流程追踪演示）
  const [jobList] = await conn.query('SELECT id FROM jobs WHERE status = ?', ['published'])
  const jobIds = jobList.map((x) => x.id)
  if (jobIds.length >= 2) {
    // 张三投递前端开发 -> 已推进到面试阶段
    await conn.query(
      'INSERT INTO job_applications (job_id, seeker_id, status, result) VALUES (?, ?, ?, ?)',
      [jobIds[0], userIds.zhangsan, 'interview', 'pending']
    )
    Q(`INSERT INTO job_applications (job_id, seeker_id, status, result) VALUES (${jobIds[0]}, ${userIds.zhangsan}, 'interview', 'pending');`)
    // 李四投递数据分析 -> 待筛选
    await conn.query(
      'INSERT INTO job_applications (job_id, seeker_id, status, result) VALUES (?, ?, ?, ?)',
      [jobIds[1], userIds.lisi, 'applied', 'pending']
    )
    Q(`INSERT INTO job_applications (job_id, seeker_id, status, result) VALUES (${jobIds[1]}, ${userIds.lisi}, 'applied', 'pending');`)
  }

  // 收藏
  await conn.query('INSERT IGNORE INTO favorites (user_id, job_id) VALUES (?, ?)', [userIds.zhangsan, jobIds[1]])
  Q(`INSERT IGNORE INTO favorites (user_id, job_id) VALUES (${userIds.zhangsan}, ${jobIds[1]});`)

  // 邀请：企业邀请王五面试前端职位
  await conn.query(
    'INSERT INTO interview_invitations (job_id, seeker_id, employer_id, message, status) VALUES (?, ?, ?, ?, ?)',
    [jobIds[0], userIds.wangwu, userIds.tech_hr, '诚邀您参加前端开发工程师职位面试。', 'pending']
  )
  Q(`INSERT INTO interview_invitations (job_id, seeker_id, employer_id, message, status) VALUES (${jobIds[0]}, ${userIds.wangwu}, ${userIds.tech_hr}, '诚邀您参加前端开发工程师职位面试。', 'pending');`)

  // 通知
  await conn.query(
    'INSERT INTO notifications (user_id, type, title, content) VALUES (?, ?, ?, ?)',
    [userIds.zhangsan, 'stage', '招聘流程更新', '你投递的「前端开发工程师」已进入「面试进行中」']
  )
  Q(`INSERT INTO notifications (user_id, type, title, content) VALUES (${userIds.zhangsan}, 'stage', '招聘流程更新', '你投递的「前端开发工程师」已进入「面试进行中」');`)

  // 生成 seed.sql
  const header = `-- ============================================================\n-- 就业服务信息系统 演示数据 (由 init-db.js 自动生成)\n-- 所有账号密码：${password}\n-- ============================================================\nUSE ${CFG.database};\n\n`
  fs.writeFileSync(seedPath, header + lines.join('\n') + '\n', 'utf8')
  console.log('[init] 已生成 seed.sql ->', seedPath)

  await conn.end()
  console.log('[init] 完成。演示账号：admin / zhangsan / lisi / wangwu / tech_hr / fin_hr，密码均为 ' + password)
}

main().catch((e) => {
  console.error('[init] 失败:', e.message)
  process.exit(1)
})

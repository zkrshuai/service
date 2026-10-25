// 端到端接口验证脚本（Node 22+，使用全局 fetch）
const BASE = 'http://localhost:3000/api'
const log = (name, res, data) => {
  console.log(`\n=== ${name} ===`)
  console.log('status:', res.status)
  console.log('body:', JSON.stringify(data).slice(0, 600))
}

async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, { method: 'POST', headers, body: JSON.stringify(body) })
  return { res, data: await res.json() }
}
async function get(path, token) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, { headers })
  return { res, data: await res.json() }
}
async function put(path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, { method: 'PUT', headers, body: JSON.stringify(body) })
  return { res, data: await res.json() }
}

let failures = 0
const check = (cond, msg) => { if (cond) console.log('  ✓', msg); else { failures++; console.log('  ✗ FAIL:', msg) } }

async function main() {
  // 1) 求职者登录
  const login = await post('/auth/login', { username: 'zhangsan', password: '123456' })
  check(login.data.code === 0 && login.data.data.token, '求职者登录')
  const seekerToken = login.data.data.token

  // 2) 职位检索（含匹配度）
  const search = await get('/jobs?keyword=&sort=score', seekerToken)
  check(search.data.code === 0 && Array.isArray(search.data.data.list), '职位检索')
  const firstJob = search.data.data.list[0]
  console.log('  首个职位:', firstJob.title, '匹配度:', firstJob.match_score)
  check(typeof firstJob.match_score === 'number', '检索返回匹配度')

  // 3) 智能推荐
  const rec = await get('/jobs/recommended', seekerToken)
  check(rec.data.code === 0 && Array.isArray(rec.data.data.list), '智能推荐')

  // 4) 职位详情（含匹配分析）
  const detail = await get(`/jobs/${firstJob.id}`, seekerToken)
  check(detail.data.data.match && typeof detail.data.data.match.score === 'number', '职位详情含匹配分析')
  check(typeof detail.data.data.applied === 'boolean', '职位详情含投递状态')

  // 5) 投递（投递一个尚未投递过的职位，避免与种子数据重复）
  const otherJob = search.data.data.list.find((j) => j.id !== firstJob.id) || firstJob
  const apply = await post('/applications', { job_id: otherJob.id }, seekerToken)
  check(apply.data.code === 0, '求职者投递')

  // 6) 我的投递
  const myApps = await get('/applications/mine', seekerToken)
  check(myApps.data.code === 0 && myApps.data.data.length >= 1, '我的投递列表')

  // 7) 企业登录
  const empLogin = await post('/auth/login', { username: 'tech_hr', password: '123456' })
  const empToken = empLogin.data.data.token
  check(!!empToken, '企业登录')

  // 8) 企业职位列表
  const empJobs = await get('/jobs/employer/mine', empToken)
  check(empJobs.data.code === 0 && empJobs.data.data.length >= 1, '企业职位列表')

  // 9) 企业查看候选人
  const apps = await get(`/applications/employer?job_id=${firstJob.id}`, empToken)
  check(apps.data.code === 0 && Array.isArray(apps.data.data), '企业查看候选人')
  const cand = apps.data.data[0]
  console.log('  候选人:', cand.seeker_name, '匹配度:', cand.match_score)

  // 10) 推进阶段
  if (cand) {
    const adv = await put(`/applications/${cand.id}/stage`, { stage: 'reviewed', note: '简历符合' }, empToken)
    check(adv.data.code === 0, '推进招聘阶段')
  }

  // 11) 人才推荐（企业侧智能匹配）
  const talents = await get(`/jobs/${firstJob.id}/matched-seekers`, empToken)
  check(talents.data.code === 0 && Array.isArray(talents.data.data), '企业人才推荐')

  // 12) 发出邀请
  if (talents.data.data.length) {
    const t = talents.data.data[0]
    const inv = await post('/invitations', { job_id: firstJob.id, seeker_id: t.id, message: '诚邀面试', invite_time: null }, empToken)
    check(inv.data.code === 0, '企业发出面试邀请')
  }

  // 13) 记录结果（求职者淘汰）
  if (cand) {
    const resR = await put(`/applications/${cand.id}/result`, { result: 'rejected', reason: '面试表现一般', note: '建议补充项目经验' }, empToken)
    check(resR.data.code === 0, '记录招聘结果')
  }

  // 14) 求职者邀请列表
  const invs = await get('/invitations/mine', seekerToken)
  check(invs.data.code === 0, '求职者邀请列表')

  // 15) 管理员登录 + 统计 + 职位审核
  const admLogin = await post('/auth/login', { username: 'admin', password: '123456' })
  const admToken = admLogin.data.data.token
  check(!!admToken, '管理员登录')
  const stats = await get('/admin/stats', admToken)
  check(stats.data.code === 0 && stats.data.data.users >= 6, '数据统计')
  const auditList = await get('/admin/jobs?status=pending', admToken)
  check(auditList.data.code === 0 && auditList.data.data.list.length >= 1, '待审核职位')
  if (auditList.data.data.list.length) {
    const j = auditList.data.data.list[0]
    const audit = await put(`/admin/jobs/${j.id}/audit`, { status: 'published' }, admToken)
    check(audit.data.code === 0, '职位审核通过')
  }

  // 16) 通知
  const notifs = await get('/notifications', seekerToken)
  check(notifs.data.code === 0 && Array.isArray(notifs.data.data), '通知列表')

  console.log(`\n========== 结果：${failures === 0 ? '全部通过 ✅' : failures + ' 项失败 ❌'} ==========`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => { console.error('测试脚本异常:', e.message); process.exit(1) })

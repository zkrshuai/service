import { Router } from 'express'
import { query } from '../config/db.js'
import { ok, fail } from '../utils/response.js'
import { auth, role } from '../middleware/auth.js'
import { matchJobWithResume } from '../utils/match.js'
import { notify, validStage, RESULT_TO_STAGE, RESULT_KEYS, STAGES } from '../utils/helpers.js'

const router = Router()

const stageLabel = (key) => {
  const s = STAGES.find((x) => x.key === key)
  return s ? s.label : key
}

// ---------- 求职者投递 ----------
router.post('/', auth, role('seeker'), async (req, res) => {
  try {
    const { job_id } = req.body
    if (!job_id) return res.json(fail('缺少职位'))
    const jobs = await query('SELECT id, title, created_by FROM jobs WHERE id = ? AND status = ?', [job_id, 'published'])
    if (!jobs.length) return res.json(fail('职位不存在或未发布'))
    const job = jobs[0]

    const dup = await query('SELECT id FROM job_applications WHERE job_id = ? AND seeker_id = ?', [job_id, req.user.id])
    if (dup.length) return res.json(fail('你已投递该职位'))

    const r = await query(
      'INSERT INTO job_applications (job_id, seeker_id, status, result) VALUES (?, ?, ?, ?)',
      [job_id, req.user.id, 'applied', 'pending']
    )
    await notify(job.created_by, 'apply', '收到新投递', `有求职者投递了「${job.title}」`)
    return res.json(ok({ id: r.insertId }))
  } catch (e) {
    console.error(e)
    return res.json(fail('投递失败'))
  }
})

// ---------- 我的投递（求职者） ----------
router.get('/mine', auth, role('seeker'), async (req, res) => {
  try {
    const rows = await query(
      `SELECT a.*, j.title AS job_title, j.city, j.salary_min, j.salary_max, c.name AS company_name
       FROM job_applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN companies c ON c.id = j.company_id
       WHERE a.seeker_id = ?
       ORDER BY a.updated_at DESC`,
      [req.user.id]
    )
    return res.json(ok(rows))
  } catch (e) {
    console.error(e)
    return res.json(fail('获取投递记录失败'))
  }
})

// ---------- 企业查看某职位候选人 ----------
router.get('/employer', auth, role('employer'), async (req, res) => {
  try {
    const { job_id } = req.query
    if (!job_id) return res.json(fail('缺少职位'))
    const jobs = await query('SELECT * FROM jobs WHERE id = ?', [job_id])
    if (!jobs.length) return res.status(404).json(fail('职位不存在'))
    const job = jobs[0]
    const cs = await query('SELECT id FROM companies WHERE created_by = ?', [req.user.id])
    if (!cs.some((c) => c.id === job.company_id)) return res.status(403).json(fail('无权操作该职位'))

    const rows = await query(
      `SELECT a.*, u.name AS seeker_name, u.email, r.full_name, r.education, r.work_years, r.skills, r.expectation_position
       FROM job_applications a
       JOIN users u ON u.id = a.seeker_id
       LEFT JOIN resumes r ON r.user_id = a.seeker_id
       WHERE a.job_id = ?
       ORDER BY a.created_at ASC`,
      [job_id]
    )
    const list = rows.map((a) => {
      const m = matchJobWithResume(job, { ...a, skills: a.skills, expectation_position: a.expectation_position })
      return { ...a, match_score: m.score }
    })
    return res.json(ok(list))
  } catch (e) {
    console.error(e)
    return res.json(fail('获取候选人失败'))
  }
})

// ---------- 推进阶段 ----------
router.put('/:id/stage', auth, role('employer'), async (req, res) => {
  try {
    const { stage, note } = req.body
    if (!validStage(stage)) return res.json(fail('非法阶段'))
    const app = await getOwnedApplication(req, req.params.id)
    if (!app) return res.status(403).json(fail('无权操作该投递'))

    await query('UPDATE job_applications SET status = ?, note = ? WHERE id = ?', [stage, note || null, req.params.id])
    await query('INSERT INTO recruitment_logs (application_id, stage, note, created_by) VALUES (?, ?, ?, ?)', [req.params.id, stage, note || null, req.user.id])
    await notify(app.seeker_id, 'stage', '招聘流程更新', `你投递的「${app.job_title}」已进入「${stageLabel(stage)}」`)
    return res.json(ok({ updated: true }))
  } catch (e) {
    console.error(e)
    return res.json(fail('推进阶段失败'))
  }
})

// ---------- 记录结果 ----------
router.put('/:id/result', auth, role('employer'), async (req, res) => {
  try {
    const { result, reason, note } = req.body
    if (!RESULT_KEYS.includes(result) || result === 'pending') return res.json(fail('非法结果'))
    const app = await getOwnedApplication(req, req.params.id)
    if (!app) return res.status(403).json(fail('无权操作该投递'))

    const stage = RESULT_TO_STAGE[result]
    await query(
      'UPDATE job_applications SET result = ?, result_reason = ?, note = ?, status = ? WHERE id = ?',
      [result, reason || null, note || null, stage, req.params.id]
    )
    await query('INSERT INTO recruitment_logs (application_id, stage, note, created_by) VALUES (?, ?, ?, ?)', [req.params.id, stage, note || `结果：${result}`, req.user.id])

    const resultText = { passed: '通过', rejected: '未通过', offered: '录用', hired: '入职' }[result] || result
    await notify(app.seeker_id, 'result', '招聘结果更新', `你投递的「${app.job_title}」结果：${resultText}${reason ? '，说明：' + reason : ''}`)
    return res.json(ok({ updated: true }))
  } catch (e) {
    console.error(e)
    return res.json(fail('记录结果失败'))
  }
})

async function getOwnedApplication(req, applicationId) {
  const rows = await query(
    `SELECT a.*, j.title AS job_title, j.company_id FROM job_applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ?`,
    [applicationId]
  )
  if (!rows.length) return null
  const app = rows[0]
  const cs = await query('SELECT id FROM companies WHERE created_by = ?', [req.user.id])
  return cs.some((c) => c.id === app.company_id) ? app : null
}

export default router

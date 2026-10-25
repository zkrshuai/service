import { Router } from 'express'
import { query } from '../config/db.js'
import { ok, fail } from '../utils/response.js'
import { auth, role } from '../middleware/auth.js'
import { notify } from '../utils/helpers.js'

const router = Router()

// ---------- 企业发出面试邀请 ----------
router.post('/', auth, role('employer'), async (req, res) => {
  try {
    const { job_id, seeker_id, message, invite_time } = req.body
    if (!job_id || !seeker_id) return res.json(fail('缺少职位或候选人'))
    const jobs = await query('SELECT * FROM jobs WHERE id = ?', [job_id])
    if (!jobs.length) return res.status(404).json(fail('职位不存在'))
    const job = jobs[0]
    const cs = await query('SELECT id FROM companies WHERE created_by = ?', [req.user.id])
    if (!cs.some((c) => c.id === job.company_id)) return res.status(403).json(fail('无权操作该职位'))

    const r = await query(
      'INSERT INTO interview_invitations (job_id, seeker_id, employer_id, message, invite_time) VALUES (?, ?, ?, ?, ?)',
      [job_id, seeker_id, req.user.id, message || null, invite_time || null]
    )
    await notify(seeker_id, 'invite', '收到面试邀请', `企业邀请你面试「${job.title}」${invite_time ? '，时间：' + invite_time : ''}`)
    return res.json(ok({ id: r.insertId }))
  } catch (e) {
    console.error(e)
    return res.json(fail('发送邀请失败'))
  }
})

// ---------- 我的邀请（求职者） ----------
router.get('/mine', auth, role('seeker'), async (req, res) => {
  try {
    const rows = await query(
      `SELECT i.*, j.title AS job_title, c.name AS company_name
       FROM interview_invitations i
       JOIN jobs j ON j.id = i.job_id
       JOIN companies c ON c.id = j.company_id
       WHERE i.seeker_id = ?
       ORDER BY i.created_at DESC`,
      [req.user.id]
    )
    return res.json(ok(rows))
  } catch (e) {
    console.error(e)
    return res.json(fail('获取邀请失败'))
  }
})

// ---------- 响应邀请（求职者接受/拒绝） ----------
router.put('/:id/respond', auth, role('seeker'), async (req, res) => {
  try {
    const { status } = req.body
    if (!['accepted', 'declined'].includes(status)) return res.json(fail('非法响应'))
    const rows = await query('SELECT * FROM interview_invitations WHERE id = ? AND seeker_id = ?', [req.params.id, req.user.id])
    if (!rows.length) return res.status(404).json(fail('邀请不存在'))
    const inv = rows[0]
    if (inv.status !== 'pending') return res.json(fail('该邀请已处理'))

    await query('UPDATE interview_invitations SET status = ? WHERE id = ?', [status, req.params.id])
    await notify(inv.employer_id, 'invite', '邀请已响应', status === 'accepted' ? '求职者已接受面试邀请' : '求职者已拒绝面试邀请')

    // 接受邀请：若尚未投递，自动建立流程记录并进入「面试邀约」阶段
    if (status === 'accepted') {
      const dup = await query('SELECT id FROM job_applications WHERE job_id = ? AND seeker_id = ?', [inv.job_id, req.user.id])
      if (!dup.length) {
        await query(
          'INSERT INTO job_applications (job_id, seeker_id, status, result) VALUES (?, ?, ?, ?)',
          [inv.job_id, req.user.id, 'invited', 'pending']
        )
      } else {
        await query('UPDATE job_applications SET status = ? WHERE job_id = ? AND seeker_id = ?', ['invited', inv.job_id, req.user.id])
      }
    }
    return res.json(ok({ updated: true }))
  } catch (e) {
    console.error(e)
    return res.json(fail('响应失败'))
  }
})

// ---------- 已发邀请（企业） ----------
router.get('/employer', auth, role('employer'), async (req, res) => {
  try {
    const rows = await query(
      `SELECT i.*, j.title AS job_title, u.name AS seeker_name
       FROM interview_invitations i
       JOIN jobs j ON j.id = i.job_id
       JOIN users u ON u.id = i.seeker_id
       WHERE i.employer_id = ?
       ORDER BY i.created_at DESC`,
      [req.user.id]
    )
    return res.json(ok(rows))
  } catch (e) {
    console.error(e)
    return res.json(fail('获取邀请失败'))
  }
})

export default router

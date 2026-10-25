import { Router } from 'express'
import { query } from '../config/db.js'
import { ok, fail, pageData } from '../utils/response.js'
import { auth, role } from '../middleware/auth.js'
import { notify } from '../utils/helpers.js'

const router = Router()
router.use(auth, role('admin'))

// ---------- 用户管理 ----------
router.get('/users', async (req, res) => {
  try {
    const { keyword = '', role: uRole = '', page = 1, pageSize = 10 } = req.query
    const where = []
    const params = []
    if (keyword) {
      where.push('(username LIKE ? OR name LIKE ? OR email LIKE ?)')
      const kw = `%${keyword}%`
      params.push(kw, kw, kw)
    }
    if (uRole) { where.push('role = ?'); params.push(uRole) }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : ''
    const total = (await query(`SELECT COUNT(*) AS n FROM users ${whereSql}`, params))[0].n
    const limit = Number(pageSize)
    const offset = (Number(page) - 1) * limit
    const list = await query(
      `SELECT id, username, role, name, email, phone, status, created_at FROM users ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )
    return res.json(ok(pageData(list, total)))
  } catch (e) {
    console.error(e)
    return res.json(fail('查询用户失败'))
  }
})

router.put('/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    if (!['active', 'disabled'].includes(status)) return res.json(fail('非法状态'))
    const rows = await query('SELECT role FROM users WHERE id = ?', [req.params.id])
    if (!rows.length) return res.status(404).json(fail('用户不存在'))
    if (rows[0].role === 'admin') return res.json(fail('不能禁用管理员账号'))
    await query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id])
    return res.json(ok({ updated: true }))
  } catch (e) {
    console.error(e)
    return res.json(fail('更新用户状态失败'))
  }
})

// ---------- 职位审核 ----------
router.get('/jobs', async (req, res) => {
  try {
    const { status = '', keyword = '', page = 1, pageSize = 10 } = req.query
    const where = []
    const params = []
    if (status) { where.push('j.status = ?'); params.push(status) }
    if (keyword) {
      where.push('(j.title LIKE ? OR c.name LIKE ?)')
      const kw = `%${keyword}%`
      params.push(kw, kw)
    }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : ''
    const base = `FROM jobs j JOIN companies c ON j.company_id = c.id ${whereSql}`
    const total = (await query(`SELECT COUNT(*) AS n ${base}`, params))[0].n
    const limit = Number(pageSize)
    const offset = (Number(page) - 1) * limit
    const list = await query(
      `SELECT j.id, j.title, j.city, j.salary_min, j.salary_max, j.status, j.created_at, c.name AS company_name ${base} ORDER BY j.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )
    return res.json(ok(pageData(list, total)))
  } catch (e) {
    console.error(e)
    return res.json(fail('查询职位失败'))
  }
})

router.put('/jobs/:id/audit', async (req, res) => {
  try {
    const { status } = req.body
    if (!['published', 'rejected'].includes(status)) return res.json(fail('非法审核结果'))
    const rows = await query('SELECT title, created_by FROM jobs WHERE id = ?', [req.params.id])
    if (!rows.length) return res.status(404).json(fail('职位不存在'))
    await query('UPDATE jobs SET status = ? WHERE id = ?', [status, req.params.id])
    await notify(rows[0].created_by, 'job_audit', status === 'published' ? '职位已通过审核' : '职位审核未通过', `职位「${rows[0].title}」${status === 'published' ? '已发布' : '未通过审核'}`)
    return res.json(ok({ updated: true }))
  } catch (e) {
    console.error(e)
    return res.json(fail('审核失败'))
  }
})

// ---------- 数据统计 ----------
router.get('/stats', async (req, res) => {
  try {
    const [users] = await query('SELECT COUNT(*) AS n FROM users')
    const [seekers] = await query("SELECT COUNT(*) AS n FROM users WHERE role = 'seeker'")
    const [employers] = await query("SELECT COUNT(*) AS n FROM users WHERE role = 'employer'")
    const [companies] = await query('SELECT COUNT(*) AS n FROM companies')
    const [jobs] = await query('SELECT COUNT(*) AS n FROM jobs')
    const [publishedJobs] = await query("SELECT COUNT(*) AS n FROM jobs WHERE status = 'published'")
    const [applications] = await query('SELECT COUNT(*) AS n FROM job_applications')
    const [invitations] = await query('SELECT COUNT(*) AS n FROM interview_invitations')
    const [hired] = await query("SELECT COUNT(*) AS n FROM job_applications WHERE result = 'hired'")
    return res.json(ok({
      users: users.n, seekers: seekers.n, employers: employers.n, companies: companies.n,
      jobs: jobs.n, publishedJobs: publishedJobs.n, applications: applications.n,
      invitations: invitations.n, hired: hired.n
    }))
  } catch (e) {
    console.error(e)
    return res.json(fail('获取统计失败'))
  }
})

export default router

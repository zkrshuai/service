import { Router } from 'express'
import { query } from '../config/db.js'
import { ok, fail, pageData } from '../utils/response.js'
import { auth, role, optionalAuth } from '../middleware/auth.js'
import { matchJobWithResume } from '../utils/match.js'
import { notify } from '../utils/helpers.js'

const router = Router()

async function getResumeOf(userId) {
  if (!userId) return null
  const rows = await query('SELECT * FROM resumes WHERE user_id = ?', [userId])
  return rows[0] || null
}

async function loadCompanyName(jobs) {
  if (!jobs.length) return jobs
  const ids = [...new Set(jobs.map((j) => j.company_id))]
  const ph = ids.map(() => '?').join(',')
  const rows = await query(`SELECT id, name FROM companies WHERE id IN (${ph})`, ids)
  const map = Object.fromEntries(rows.map((r) => [r.id, r.name]))
  return jobs.map((j) => ({ ...j, company_name: map[j.company_id] || '' }))
}

// ---------- 职位检索 ----------
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      keyword = '', city = '', industry = '', jobType = '', education = '',
      salaryMin, salaryMax, sort = 'new', page = 1, pageSize = 10
    } = req.query

    const where = ["j.status = 'published'"]
    const params = []
    if (keyword) {
      where.push('(j.title LIKE ? OR j.skills LIKE ? OR c.name LIKE ?)')
      const kw = `%${keyword}%`
      params.push(kw, kw, kw)
    }
    if (city) { where.push('j.city = ?'); params.push(city) }
    if (industry) { where.push('j.industry = ?'); params.push(industry) }
    if (jobType) { where.push('j.job_type = ?'); params.push(jobType) }
    if (education) { where.push('j.education_required = ?'); params.push(education) }
    if (salaryMin) { where.push('j.salary_max >= ?'); params.push(Number(salaryMin)) }
    if (salaryMax) { where.push('j.salary_min <= ?'); params.push(Number(salaryMax)) }

    const whereSql = where.join(' AND ')
    const base = `FROM jobs j JOIN companies c ON j.company_id = c.id WHERE ${whereSql}`

    const orderSql =
      sort === 'salary_desc' ? 'ORDER BY j.salary_max DESC' :
      sort === 'salary_asc' ? 'ORDER BY j.salary_max ASC' :
      'ORDER BY j.created_at DESC'

    const countRows = await query(`SELECT COUNT(*) AS n ${base}`, params)
    const total = countRows[0].n

    const seekerId = req.user && req.user.role === 'seeker' ? req.user.id : null
    let list
    if (sort === 'score' && seekerId) {
      // 相关度排序：按匹配度在内存中排序
      const all = await query(`SELECT j.*, c.name AS company_name ${base} ${orderSql}`, params)
      const resume = await getResumeOf(seekerId)
      const scored = all.map((j) => {
        const m = matchJobWithResume(j, resume)
        return { ...j, match_score: m.score, match_missing: m.missing }
      })
      scored.sort((a, b) => b.match_score - a.match_score)
      const start = (Number(page) - 1) * Number(pageSize)
      list = scored.slice(start, start + Number(pageSize))
    } else {
      const limit = Number(pageSize)
      const offset = (Number(page) - 1) * limit
      const rows = await query(
        `SELECT j.*, c.name AS company_name ${base} ${orderSql} LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      )
      list = rows
      if (seekerId) {
        const resume = await getResumeOf(seekerId)
        list = list.map((j) => {
          const m = matchJobWithResume(j, resume)
          return { ...j, match_score: m.score, match_missing: m.missing }
        })
      }
    }
    return res.json(ok(pageData(list, total)))
  } catch (e) {
    console.error(e)
    return res.json(fail('职位检索失败'))
  }
})

// ---------- 智能推荐（基于简历画像） ----------
router.get('/recommended', auth, role('seeker'), async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query
    const resume = await getResumeOf(req.user.id)
    if (!resume) return res.json(ok(pageData([], 0)))

    const rows = await query(
      `SELECT j.*, c.name AS company_name FROM jobs j JOIN companies c ON j.company_id = c.id WHERE j.status = 'published'`
    )
    const scored = rows.map((j) => {
      const m = matchJobWithResume(j, resume)
      return { ...j, match_score: m.score, match_missing: m.missing }
    })
    scored.sort((a, b) => b.match_score - a.match_score)
    const start = (Number(page) - 1) * Number(pageSize)
    return res.json(ok(pageData(scored.slice(start, start + Number(pageSize)), scored.length)))
  } catch (e) {
    console.error(e)
    return res.json(fail('获取推荐失败'))
  }
})

// ---------- 企业自己的职位 ----------
router.get('/employer/mine', auth, role('employer'), async (req, res) => {
  try {
    const cs = await query('SELECT id FROM companies WHERE created_by = ?', [req.user.id])
    const companyIds = cs.map((c) => c.id)
    if (!companyIds.length) return res.json(ok([]))
    const ph = companyIds.map(() => '?').join(',')
    const rows = await query(
      `SELECT * FROM jobs WHERE company_id IN (${ph}) ORDER BY created_at DESC`,
      companyIds
    )
    return res.json(ok(rows))
  } catch (e) {
    console.error(e)
    return res.json(fail('获取职位失败'))
  }
})

// ---------- 发布职位 ----------
router.post('/', auth, role('employer'), async (req, res) => {
  try {
    const cs = await query('SELECT id FROM companies WHERE created_by = ?', [req.user.id])
    if (!cs.length) return res.json(fail('请先完善企业信息后再发布职位'))
    const companyId = cs[0].id
    const { title, city, industry, job_type, salary_min, salary_max, education_required, experience_required, skills, description, requirements } = req.body
    if (!title) return res.json(fail('请填写职位名称'))

    const r = await query(
      `INSERT INTO jobs (company_id, created_by, title, city, industry, job_type, salary_min, salary_max, education_required, experience_required, skills, description, requirements, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [companyId, req.user.id, title, city || null, industry || null, job_type || '全职',
       salary_min || null, salary_max || null, education_required || '不限',
       experience_required || '不限', skills || null, description || null, requirements || null]
    )
    const admins = await query('SELECT id FROM users WHERE role = ?', ['admin'])
    for (const a of admins) {
      await notify(a.id, 'job_audit', '新职位待审核', `职位「${title}」待审核`)
    }
    return res.json(ok({ id: r.insertId }))
  } catch (e) {
    console.error(e)
    return res.json(fail('发布职位失败'))
  }
})

// ---------- 职位详情 ----------
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const rows = await query(
      'SELECT j.*, c.name AS company_name, c.scale AS company_scale FROM jobs j JOIN companies c ON j.company_id = c.id WHERE j.id = ?',
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json(fail('职位不存在'))
    const job = rows[0]
    await query('UPDATE jobs SET view_count = view_count + 1 WHERE id = ?', [req.params.id])

    const result = { job: { ...job, view_count: (job.view_count || 0) + 1 }, match: null, favorite: false, applied: false }
    if (req.user && req.user.role === 'seeker') {
      const resume = await getResumeOf(req.user.id)
      result.match = matchJobWithResume(job, resume)
      const fav = await query('SELECT id FROM favorites WHERE user_id = ? AND job_id = ?', [req.user.id, req.params.id])
      result.favorite = fav.length > 0
      const app = await query('SELECT id FROM job_applications WHERE job_id = ? AND seeker_id = ?', [req.params.id, req.user.id])
      result.applied = app.length > 0
    }
    return res.json(ok(result))
  } catch (e) {
    console.error(e)
    return res.json(fail('获取职位失败'))
  }
})

// ---------- 编辑 / 上下线 ----------
router.put('/:id', auth, role('employer'), async (req, res) => {
  try {
    const rows = await query(
      'SELECT j.*, c.name AS company_name FROM jobs j JOIN companies c ON j.company_id = c.id WHERE j.id = ?',
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json(fail('职位不存在'))
    const job = rows[0]
    const cs = await query('SELECT id FROM companies WHERE created_by = ?', [req.user.id])
    if (!cs.some((c) => c.id === job.company_id)) return res.status(403).json(fail('无权操作该职位'))

    const { title, city, industry, job_type, salary_min, salary_max, education_required, experience_required, skills, description, requirements, status } = req.body

    if (status && ['closed', 'published'].includes(status)) {
      await query('UPDATE jobs SET status = ? WHERE id = ?', [status, req.params.id])
      return res.json(ok({ saved: true }))
    }

    await query(
      `UPDATE jobs SET title = ?, city = ?, industry = ?, job_type = ?, salary_min = ?, salary_max = ?,
       education_required = ?, experience_required = ?, skills = ?, description = ?, requirements = ? WHERE id = ?`,
      [title, city || null, industry || null, job_type || '全职', salary_min || null, salary_max || null,
       education_required || '不限', experience_required || '不限', skills || null, description || null, requirements || null, req.params.id]
    )
    return res.json(ok({ saved: true }))
  } catch (e) {
    console.error(e)
    return res.json(fail('更新职位失败'))
  }
})

// ---------- 人才推荐（企业侧智能匹配） ----------
router.get('/:id/matched-seekers', auth, role('employer'), async (req, res) => {
  try {
    const rows = await query('SELECT * FROM jobs WHERE id = ?', [req.params.id])
    if (!rows.length) return res.status(404).json(fail('职位不存在'))
    const job = rows[0]
    const cs = await query('SELECT id FROM companies WHERE created_by = ?', [req.user.id])
    if (!cs.some((c) => c.id === job.company_id)) return res.status(403).json(fail('无权操作该职位'))

    const applied = await query(
      'SELECT seeker_id FROM job_applications WHERE job_id = ?',
      [req.params.id]
    )
    const appliedSet = new Set(applied.map((a) => a.seeker_id))

    const resumes = await query(
      `SELECT r.* FROM resumes r JOIN users u ON u.id = r.user_id
       WHERE u.role = 'seeker' AND u.status = 'active'`
    )
    const list = resumes
      .filter((r) => !appliedSet.has(r.user_id))
      .map((r) => {
        const m = matchJobWithResume(job, r)
        return {
          id: r.user_id,
          name: r.full_name || '',
          education: r.education || '',
          work_years: r.work_years || '0',
          skills: r.skills || '',
          expectation_position: r.expectation_position || '',
          expectation_city: r.expectation_city || '',
          match_score: m.score
        }
      })
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 50)

    return res.json(ok(list))
  } catch (e) {
    console.error(e)
    return res.json(fail('获取匹配人才失败'))
  }
})

export default router

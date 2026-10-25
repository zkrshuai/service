import { Router } from 'express'
import { query } from '../config/db.js'
import { ok, fail } from '../utils/response.js'
import { auth, role } from '../middleware/auth.js'

const router = Router()
router.use(auth, role('seeker'))

const FIELDS = [
  'full_name', 'gender', 'birth_date', 'city', 'phone', 'email',
  'education', 'work_years', 'skills', 'expectation_position',
  'expectation_city', 'job_type', 'expectation_salary_min',
  'expectation_salary_max', 'self_intro'
]

router.get('/', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM resumes WHERE user_id = ?', [req.user.id])
    return res.json(ok(rows[0] || null))
  } catch (e) {
    console.error(e)
    return res.json(fail('获取简历失败'))
  }
})

router.post('/', async (req, res) => {
  try {
    const existing = await query('SELECT id FROM resumes WHERE user_id = ?', [req.user.id])
    if (existing.length) return res.json(fail('简历已存在，请使用更新'))
    const data = pick(req.body)
    const cols = Object.keys(data)
    const vals = Object.values(data)
    await query(
      `INSERT INTO resumes (user_id, ${cols.join(', ')}) VALUES (${['?', ...cols.map(() => '?')].join(', ')})`,
      [req.user.id, ...vals]
    )
    return res.json(ok({ saved: true }))
  } catch (e) {
    console.error(e)
    return res.json(fail('保存简历失败'))
  }
})

router.put('/:id', async (req, res) => {
  try {
    const rows = await query('SELECT id FROM resumes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
    if (!rows.length) return res.status(404).json(fail('简历不存在'))
    const data = pick(req.body)
    const sets = Object.keys(data).map((k) => `${k} = ?`)
    const vals = Object.values(data)
    await query(`UPDATE resumes SET ${sets.join(', ')} WHERE id = ?`, [...vals, req.params.id])
    return res.json(ok({ saved: true }))
  } catch (e) {
    console.error(e)
    return res.json(fail('更新简历失败'))
  }
})

function pick(obj) {
  const out = {}
  FIELDS.forEach((f) => {
    if (obj[f] !== undefined) out[f] = obj[f] === '' ? null : obj[f]
  })
  return out
}

export default router

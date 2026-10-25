import { Router } from 'express'
import { query } from '../config/db.js'
import { ok, fail } from '../utils/response.js'
import { auth, role } from '../middleware/auth.js'

const router = Router()
router.use(auth, role('seeker'))

router.get('/', async (req, res) => {
  try {
    const rows = await query(
      `SELECT j.*, c.name AS company_name
       FROM favorites f
       JOIN jobs j ON j.id = f.job_id
       JOIN companies c ON c.id = j.company_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [req.user.id]
    )
    return res.json(ok(rows))
  } catch (e) {
    console.error(e)
    return res.json(fail('获取收藏失败'))
  }
})

router.post('/', async (req, res) => {
  try {
    const { job_id } = req.body
    if (!job_id) return res.json(fail('缺少职位'))
    const jobs = await query('SELECT id FROM jobs WHERE id = ?', [job_id])
    if (!jobs.length) return res.status(404).json(fail('职位不存在'))
    await query('INSERT IGNORE INTO favorites (user_id, job_id) VALUES (?, ?)', [req.user.id, job_id])
    return res.json(ok({ saved: true }))
  } catch (e) {
    console.error(e)
    return res.json(fail('收藏失败'))
  }
})

router.delete('/:jobId', async (req, res) => {
  try {
    await query('DELETE FROM favorites WHERE user_id = ? AND job_id = ?', [req.user.id, req.params.jobId])
    return res.json(ok({ removed: true }))
  } catch (e) {
    console.error(e)
    return res.json(fail('取消收藏失败'))
  }
})

export default router

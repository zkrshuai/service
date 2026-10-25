import { Router } from 'express'
import { query } from '../config/db.js'
import { ok, fail } from '../utils/response.js'
import { auth } from '../middleware/auth.js'

const router = Router()
router.use(auth)

router.get('/', async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY is_read ASC, created_at DESC LIMIT 50',
      [req.user.id]
    )
    return res.json(ok(rows))
  } catch (e) {
    console.error(e)
    return res.json(fail('获取通知失败'))
  }
})

router.put('/:id/read', async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
    return res.json(ok({ updated: true }))
  } catch (e) {
    console.error(e)
    return res.json(fail('标记失败'))
  }
})

router.put('/read-all', async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id])
    return res.json(ok({ updated: true }))
  } catch (e) {
    console.error(e)
    return res.json(fail('标记失败'))
  }
})

export default router

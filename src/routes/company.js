import { Router } from 'express'
import { query } from '../config/db.js'
import { ok, fail } from '../utils/response.js'
import { auth, role } from '../middleware/auth.js'

const router = Router()
router.use(auth, role('employer'))

router.get('/mine', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM companies WHERE created_by = ? ORDER BY id LIMIT 1', [req.user.id])
    return res.json(ok(rows[0] || null))
  } catch (e) {
    console.error(e)
    return res.json(fail('获取企业信息失败'))
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, city, industry, scale, description } = req.body
    if (!name) return res.json(fail('请填写企业名称'))
    const existing = await query('SELECT id FROM companies WHERE created_by = ?', [req.user.id])
    if (existing.length) return res.json(fail('企业信息已存在，请使用更新'))
    const r = await query(
      'INSERT INTO companies (name, city, industry, scale, description, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [name, city || null, industry || null, scale || null, description || null, req.user.id]
    )
    return res.json(ok({ id: r.insertId }))
  } catch (e) {
    console.error(e)
    return res.json(fail('保存企业信息失败'))
  }
})

router.put('/:id', async (req, res) => {
  try {
    const rows = await query('SELECT id FROM companies WHERE id = ? AND created_by = ?', [req.params.id, req.user.id])
    if (!rows.length) return res.status(404).json(fail('企业信息不存在'))
    const { name, city, industry, scale, description } = req.body
    await query(
      'UPDATE companies SET name = ?, city = ?, industry = ?, scale = ?, description = ? WHERE id = ?',
      [name, city || null, industry || null, scale || null, description || null, req.params.id]
    )
    return res.json(ok({ saved: true }))
  } catch (e) {
    console.error(e)
    return res.json(fail('更新企业信息失败'))
  }
})

export default router

import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../config/db.js'
import { ok, fail } from '../utils/response.js'
import { auth, signToken } from '../middleware/auth.js'

const router = Router()

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, role = 'seeker', name = '', email = '', phone = '', companyName = '' } = req.body
    if (!username || !password) return res.json(fail('用户名和密码不能为空'))
    if (password.length < 6) return res.json(fail('密码至少 6 位'))
    if (!['seeker', 'employer'].includes(role)) return res.json(fail('非法角色'))
    if (role === 'employer' && !companyName) return res.json(fail('请填写企业名称'))

    const exist = await query('SELECT id FROM users WHERE username = ?', [username])
    if (exist.length) return res.json(fail('用户名已存在'))

    const hash = await bcrypt.hash(password, 10)
    const result = await query(
      'INSERT INTO users (username, password, role, name, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hash, role, name, email, phone]
    )
    const userId = result.insertId

    if (role === 'employer' && companyName) {
      await query(
        'INSERT INTO companies (name, created_by) VALUES (?, ?)',
        [companyName, userId]
      )
    }
    return res.json(ok({ id: userId }))
  } catch (e) {
    console.error(e)
    return res.json(fail('注册失败'))
  }
})

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.json(fail('请输入用户名和密码'))
    const rows = await query('SELECT * FROM users WHERE username = ?', [username])
    if (!rows.length) return res.json(fail('用户名或密码错误'))
    const user = rows[0]
    if (user.status === 'disabled') return res.json(fail('账号已被禁用，请联系管理员'))
    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.json(fail('用户名或密码错误'))

    const token = signToken(user)
    const safe = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone
    }
    return res.json(ok({ token, user: safe }))
  } catch (e) {
    console.error(e)
    return res.json(fail('登录失败'))
  }
})

// 当前用户
router.get('/me', auth, async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, username, role, name, email, phone, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    )
    if (!rows.length) return res.status(404).json(fail('用户不存在'))
    const user = rows[0]
    if (user.role === 'employer') {
      const cs = await query('SELECT id FROM companies WHERE created_by = ? ORDER BY id LIMIT 1', [user.id])
      user.company_id = cs.length ? cs[0].id : null
    }
    return res.json(ok(user))
  } catch (e) {
    console.error(e)
    return res.json(fail('获取用户信息失败'))
  }
})

export default router

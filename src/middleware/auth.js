import jwt from 'jsonwebtoken'
import { fail } from '../utils/response.js'

export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, username: user.username },
    process.env.JWT_SECRET || 'employment_system_secret_change_me',
    { expiresIn: process.env.JWT_EXPIRES || '7d' }
  )
}

export function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return res.status(401).json(fail('未登录', 401))
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'employment_system_secret_change_me')
    req.user = { id: payload.id, role: payload.role, username: payload.username }
    next()
  } catch (e) {
    return res.status(401).json(fail('登录已过期，请重新登录', 401))
  }
}

export function role(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json(fail('无权限执行该操作', 403))
    }
    next()
  }
}

// 可选认证：有合法 token 时解析出 req.user，否则不拦截（用于公开接口按需计算匹配度）
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return next()
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'employment_system_secret_change_me')
    req.user = { id: payload.id, role: payload.role, username: payload.username }
  } catch (e) {
    // token 无效则视为未登录
  }
  next()
}

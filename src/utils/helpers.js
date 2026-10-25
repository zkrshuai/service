import { query } from '../config/db.js'

// ---------- 招聘流程阶段 ----------
export const STAGES = [
  { key: 'applied', label: '已投递' },
  { key: 'reviewed', label: '筛选通过' },
  { key: 'invited', label: '面试邀约' },
  { key: 'interview', label: '面试进行中' },
  { key: 'offered', label: '录用' },
  { key: 'hired', label: '已入职' },
  { key: 'rejected', label: '未通过' },
  { key: 'withdrawn', label: '已撤回' }
]
export const STAGE_KEYS = STAGES.map((s) => s.key)
export const TERMINAL_STAGES = ['hired', 'rejected', 'withdrawn']

export const RESULT_KEYS = ['pending', 'passed', 'rejected', 'offered', 'hired']

// 结果 -> 落点阶段
export const RESULT_TO_STAGE = { passed: 'reviewed', rejected: 'rejected', offered: 'offered', hired: 'hired' }

export function validStage(s) {
  return STAGE_KEYS.includes(s)
}

// ---------- 教育 / 经验等级 ----------
export const EDUCATION_RANK = { 不限: 0, 大专: 1, 本科: 2, 硕士: 3, 博士: 4 }

export function experienceToYears(text) {
  if (!text || text === '不限') return 0
  const m = String(text).match(/(\d+(?:\.\d+)?)/)
  if (!m) return 0
  const n = Number(m[1])
  if (text.includes('以下')) return 0
  if (text.includes('以上')) return n
  return n
}

// ---------- 通知 ----------
export async function notify(userId, type, title, content) {
  if (!userId) return
  try {
    await query(
      'INSERT INTO notifications (user_id, type, title, content) VALUES (?, ?, ?, ?)',
      [userId, type || 'system', title || '', content || '']
    )
  } catch (e) {
    console.error('notify error:', e.message)
  }
}

// ---------- 列表解析 ----------
export function skillList(s) {
  if (!s) return []
  return String(s)
    .split(/[,，;；、]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

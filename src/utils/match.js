import { EDUCATION_RANK, experienceToYears, skillList } from './helpers.js'

/**
 * 智能匹配：根据职位要求与求职者简历画像计算匹配度（0-100）
 * 返回 { score, matched[], missing[], detail }
 */
export function matchJobWithResume(job, resume) {
  const matched = []
  const missing = []
  let score = 0

  if (!resume) {
    return { score: 0, matched: [], missing: [], detail: {} }
  }

  // 1) 技能重合（权重 40）
  const jobSkills = skillList(job.skills)
  const resumeSkills = skillList(resume.skills)
  const jobSkillSet = new Set(jobSkills.map((s) => s.toLowerCase()))
  const resumeSkillSet = new Set(resumeSkills.map((s) => s.toLowerCase()))
  const hitSkills = jobSkills.filter((s) => resumeSkillSet.has(s.toLowerCase()))
  const missSkills = jobSkills.filter((s) => !resumeSkillSet.has(s.toLowerCase()))
  if (jobSkills.length > 0) {
    const ratio = hitSkills.length / jobSkills.length
    score += 40 * ratio
    if (hitSkills.length > 0) matched.push(`技能匹配：${hitSkills.join('、')}`)
    if (missSkills.length > 0) missing.push(`缺少技能：${missSkills.join('、')}`)
  } else {
    score += 40
  }

  // 2) 职位方向匹配（权重 15）
  const positionOverlap = overlapRatio(
    [job.title, ...jobSkills],
    [resume.expectation_position, ...resumeSkills]
  )
  score += 15 * positionOverlap
  if (positionOverlap >= 0.5) matched.push('职位方向与求职意向相符')
  else if (resume.expectation_position) missing.push('求职意向与职位方向差异较大')

  // 3) 薪资匹配（权重 15）
  const sal = salaryOverlap(job.salary_min, job.salary_max, resume.expectation_salary_min, resume.expectation_salary_max)
  score += 15 * sal
  if (sal >= 0.5) matched.push('薪资区间与期望相符')
  else if (resume.expectation_salary_min) missing.push('薪资区间与期望存在差距')

  // 4) 学历（权重 10）
  const reqEdu = EDUCATION_RANK[job.education_required] || 0
  const resEdu = EDUCATION_RANK[resume.education] || 0
  if (reqEdu === 0 || resEdu >= reqEdu) {
    score += 10
    matched.push(`学历符合要求${job.education_required && job.education_required !== '不限' ? `（${job.education_required}）` : ''}`)
  } else {
    missing.push(`学历未达要求（需 ${job.education_required}）`)
  }

  // 5) 经验（权重 10）
  const reqExp = experienceToYears(job.experience_required)
  const resExp = Number(resume.work_years || 0)
  if (reqExp === 0 || resExp >= reqExp) {
    score += 10
    matched.push('工作经验满足要求')
  } else {
    missing.push(`经验不足（需 ${job.experience_required}）`)
  }

  // 6) 城市（权重 10）
  const cityOk =
    !job.city ||
    !resume.expectation_city ||
    job.city === resume.expectation_city ||
    job.city === resume.city
  if (cityOk) {
    score += 10
    if (job.city) matched.push(`工作城市（${job.city}）可接受`)
  } else {
    missing.push(`城市不匹配（职位：${job.city}，期望：${resume.expectation_city}）`)
  }

  return {
    score: Math.round(score),
    matched,
    missing,
    detail: { jobSkills: jobSkills.length, hitSkills: hitSkills.length }
  }
}

function overlapRatio(aWords, bWords) {
  const a = new Set((aWords || []).filter(Boolean).map((s) => String(s).toLowerCase()))
  const b = new Set((bWords || []).filter(Boolean).map((s) => String(s).toLowerCase()))
  if (a.size === 0) return 0.4
  let hit = 0
  a.forEach((w) => {
    if (b.has(w)) hit++
  })
  return Math.min(1, hit / a.size)
}

function salaryOverlap(jmin, jmax, emin, emax) {
  if (!emin && !emax) return 1
  const jMin = jmin || 0
  const jMax = jmax || 999
  const eMin = emin || 0
  const eMax = emax || 999
  const overlap = Math.max(0, Math.min(jMax, eMax) - Math.max(jMin, eMin))
  const span = Math.max(1, eMax - eMin)
  return Math.min(1, overlap / span)
}

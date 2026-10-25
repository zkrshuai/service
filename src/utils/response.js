export const ok = (data = null) => ({ code: 0, data, message: 'ok' })
export const fail = (message = '请求失败', code = 1) => ({ code, message })
export const pageData = (list, total) => ({ list, total })

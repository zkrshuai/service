import express from 'express'
import cors from 'cors'
import routes from './routes/index.js'
import { fail } from './utils/response.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/api', routes)

app.get('/api/health', (req, res) => {
  res.json({ code: 0, data: { status: 'up', time: new Date().toISOString() }, message: 'ok' })
})

// 统一错误兜底
app.use((req, res) => {
  res.status(404).json(fail('接口不存在'))
})

// 全局异常
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json(fail('服务器内部错误'))
})

export default app

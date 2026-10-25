import dotenv from 'dotenv'
import app from './app.js'
import pool from './config/db.js'

dotenv.config()

const PORT = Number(process.env.PORT || 3000)

async function start() {
  try {
    const conn = await pool.getConnection()
    await conn.ping()
    conn.release()
    console.log('[db] MySQL 连接成功')
  } catch (e) {
    console.error('[db] MySQL 连接失败，请确认已创建数据库并配置 .env')
    console.error(e.message)
  }

  app.listen(PORT, () => {
    console.log(`[server] 就业服务信息系统后端已启动: http://localhost:${PORT}`)
  })
}

start()

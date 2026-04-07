import crypto from 'node:crypto'
import {
  signToken,
  generateRefreshToken,
  hashRefreshToken,
  ACCESS_TOKEN_EXPIRES,
  REFRESH_TOKEN_EXPIRES_LONG,
  REFRESH_TOKEN_EXPIRES_SHORT
} from '../../auth/jwt.js'
import { getJwtSecret } from '../../auth/key-store.js'
import { verifyPassword } from '../../auth/password.js'
import { json, error } from '../../utils/response.js'
import {
  isRateLimited,
  recordFailedAttempt,
  clearAttempts
} from '../../auth/rateLimiter.js'
import {
  getClientIp,
  recordLoginAttempt,
  getLoginAttempts
} from './loginAttempts.js'
import { getDb } from '../../db/init.js'

/**
 * 保存 refresh token 到数据库
 */
function saveRefreshToken(tokenHash, username, rememberMe, expiresInSec) {
  const db = getDb()
  const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString()
  db.prepare(
    `INSERT INTO refresh_tokens (token_hash, username, remember_me, expires_at) VALUES (?, ?, ?, ?)`
  ).run(tokenHash, username, rememberMe ? 1 : 0, expiresAt)
}

/**
 * 生成 access + refresh token 对
 */
function generateTokenPair(username, jwtSecret, rememberMe) {
  const accessToken = signToken(
    { sub: username },
    jwtSecret,
    ACCESS_TOKEN_EXPIRES
  )
  const refreshExp = rememberMe
    ? REFRESH_TOKEN_EXPIRES_LONG
    : REFRESH_TOKEN_EXPIRES_SHORT
  const { raw, hash } = generateRefreshToken()
  saveRefreshToken(hash, username, rememberMe, refreshExp)
  return { accessToken, refreshToken: raw }
}

/**
 * 清理过期的 refresh token
 */
function cleanExpiredRefreshTokens() {
  const db = getDb()
  db.prepare(
    `DELETE FROM refresh_tokens WHERE expires_at < datetime('now')`
  ).run()
}

export function registerAuthRoutes(router) {
  router.post('/api/auth/login', (req, res) => {
    const { username, password, rememberMe } = req.body
    const ip = getClientIp(req)

    if (!username || !password) {
      return error(res, '请输入用户名和密码')
    }

    // Check rate limit BEFORE processing - don't log blocked attempts
    if (isRateLimited(ip)) {
      return error(res, '登录尝试过于频繁，请1小时后再试', 429)
    }

    const adminUser = process.env.ADMIN_USERNAME
    const adminPass = process.env.ADMIN_PASSWORD
    const adminPassHash = process.env.ADMIN_PASSWORD_HASH

    if (!adminUser || (!adminPass && !adminPassHash)) {
      return error(res, '未配置管理员账号', 500)
    }

    let jwtSecret
    try {
      jwtSecret = getJwtSecret()
    } catch (e) {
      console.error('JWT key unavailable:', e)
      return error(res, '服务端 JWT 密钥不可用', 500)
    }

    const userHash = crypto.createHash('sha256').update(username).digest()
    const adminUserHash = crypto.createHash('sha256').update(adminUser).digest()

    const userMatch = crypto.timingSafeEqual(userHash, adminUserHash)
    const passMatch = verifyPassword(password, adminPass, adminPassHash)

    if (!userMatch || !passMatch) {
      recordFailedAttempt(ip)
      recordLoginAttempt(ip, username, false)
      return error(res, '用户名或密码错误', 401)
    }

    // Successful login - clear rate limit and record
    clearAttempts(ip)
    recordLoginAttempt(ip, username, true)

    // 定期清理过期 token
    cleanExpiredRefreshTokens()

    const keep = !!rememberMe
    const { accessToken, refreshToken } = generateTokenPair(
      adminUser,
      jwtSecret,
      keep
    )
    json(res, { token: accessToken, refreshToken, username: adminUser })
  })

  /**
   * 刷新 token 接口 — 无需 access token 授权
   * 用客户端持有的 refresh token 换取新的 access + refresh token 对
   */
  router.post('/api/auth/refresh', (req, res) => {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return error(res, 'refresh token 缺失', 401)
    }

    let jwtSecret
    try {
      jwtSecret = getJwtSecret()
    } catch (e) {
      console.error('JWT key unavailable:', e)
      return error(res, '服务端 JWT 密钥不可用', 500)
    }

    const db = getDb()
    const tokenHash = hashRefreshToken(refreshToken)
    const row = db
      .prepare(`SELECT * FROM refresh_tokens WHERE token_hash = ?`)
      .get(tokenHash)

    if (!row) {
      return error(res, 'refresh token 无效', 401)
    }

    // 检查是否过期
    if (new Date(row.expires_at) < new Date()) {
      db.prepare(`DELETE FROM refresh_tokens WHERE id = ?`).run(row.id)
      return error(res, 'refresh token 已过期，请重新登录', 401)
    }

    // 旧 token 一次性使用 — 立即删除（rotation）
    db.prepare(`DELETE FROM refresh_tokens WHERE id = ?`).run(row.id)

    const rememberMe = row.remember_me === 1
    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(
      row.username,
      jwtSecret,
      rememberMe
    )

    json(res, {
      token: accessToken,
      refreshToken: newRefreshToken,
      username: row.username
    })
  })

  /**
   * 登出 — 删除当前 refresh token
   */
  router.post('/api/auth/logout', (req, res) => {
    const { refreshToken } = req.body
    if (refreshToken) {
      const db = getDb()
      const tokenHash = hashRefreshToken(refreshToken)
      db.prepare(`DELETE FROM refresh_tokens WHERE token_hash = ?`).run(
        tokenHash
      )
    }
    json(res, { ok: true })
  })

  router.get('/api/auth/check', (req, res) => {
    json(res, { valid: true, username: req.user?.sub })
  })

  router.get('/api/auth/login-attempts', (req, res) => {
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 20
    const data = getLoginAttempts(page, Math.min(pageSize, 100))
    json(res, data)
  })
}

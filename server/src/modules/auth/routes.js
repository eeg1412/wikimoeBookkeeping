import crypto from 'node:crypto'
import { signToken } from '../../auth/jwt.js'
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

export function registerAuthRoutes(router) {
  router.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body
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
    const jwtSecret = process.env.JWT_SECRET

    if (!adminUser || (!adminPass && !adminPassHash)) {
      return error(res, '未配置管理员账号', 500)
    }

    if (!jwtSecret) {
      return error(res, '服务端未正确配置 JWT_SECRET', 500)
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

    const token = signToken({ sub: username }, jwtSecret)
    json(res, { token, username })
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

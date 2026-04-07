import { verifyToken } from './jwt.js'
import { error } from '../utils/response.js'

export function authMiddleware(req, res, next) {
  if (req.pathname === '/api/auth/login' && req.method === 'POST') {
    return next()
  }

  if (!req.pathname.startsWith('/api/')) {
    return next()
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, '未登录', 401)
  }

  const token = authHeader.slice(7)
  const secret = process.env.JWT_SECRET
  if (!secret) {
    return error(res, '服务端未正确配置 JWT_SECRET', 500)
  }

  try {
    req.user = verifyToken(token, secret)
    next()
  } catch {
    return error(res, '登录已过期', 401)
  }
}

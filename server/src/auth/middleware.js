import { verifyToken } from './jwt.js'
import { getJwtSecret } from './key-store.js'
import { error } from '../utils/response.js'

/** 不需要 access token 的公开路由 */
const PUBLIC_ROUTES = [
  { method: 'POST', path: '/api/auth/login' },
  { method: 'POST', path: '/api/auth/refresh' },
  { method: 'POST', path: '/api/auth/logout' }
]

export function authMiddleware(req, res, next) {
  // 公开路由直接放行
  if (
    PUBLIC_ROUTES.some(r => r.method === req.method && r.path === req.pathname)
  ) {
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
  let secret
  try {
    secret = getJwtSecret()
  } catch (e) {
    console.error('JWT key unavailable:', e)
    return error(res, '服务端 JWT 密钥不可用', 500)
  }

  try {
    req.user = verifyToken(token, secret)
    next()
  } catch {
    return error(res, '登录已过期', 401)
  }
}

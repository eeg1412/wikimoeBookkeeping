import crypto from 'node:crypto'

/** Access token 有效期：10 分钟 */
export const ACCESS_TOKEN_EXPIRES = 10 * 60
/** Refresh token 有效期 — 保持登录：1 年 */
export const REFRESH_TOKEN_EXPIRES_LONG = 365 * 86400
/** Refresh token 有效期 — 不保持登录：24 小时 */
export const REFRESH_TOKEN_EXPIRES_SHORT = 24 * 3600

export function signToken(payload, secret, expiresIn = ACCESS_TOKEN_EXPIRES) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = { ...payload, iat: now, exp: now + expiresIn }

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url')
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString(
    'base64url'
  )
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url')

  return `${headerB64}.${payloadB64}.${signature}`
}

export function verifyToken(token, secret) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token format')

  const [headerB64, payloadB64, signature] = parts
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url')

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    throw new Error('Invalid signature')
  }

  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString())
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error('Token expired')
  }

  return payload
}

/**
 * 生成不透明的 refresh token（非 JWT，纯随机值）
 * 返回 { raw, hash } — raw 发给客户端，hash 存数据库
 */
export function generateRefreshToken() {
  const raw = crypto.randomBytes(48).toString('base64url')
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  return { raw, hash }
}

/** 计算 refresh token 的 hash（用于查询数据库） */
export function hashRefreshToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

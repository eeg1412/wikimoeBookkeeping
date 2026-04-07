import { getDb } from '../../db/init.js'

export function getClientIp(req) {
  const behindCdn = process.env.BEHIND_CDN === 'true'
  if (behindCdn) {
    const forwarded =
      req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      req.headers['x-forwarded-for']
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
  }
  return req.socket?.remoteAddress || 'unknown'
}

export function recordLoginAttempt(ip, username, success) {
  const db = getDb()
  // Truncate username to 12 chars
  const safeUsername = String(username || '').slice(0, 12)
  db.prepare(
    'INSERT INTO login_attempts (ip, username, success) VALUES (?, ?, ?)'
  ).run(ip, safeUsername, success ? 1 : 0)
}

export function getLoginAttempts(page = 1, pageSize = 20) {
  const db = getDb()
  const offset = (page - 1) * pageSize
  const total = db
    .prepare('SELECT COUNT(*) as count FROM login_attempts')
    .get().count
  const list = db
    .prepare(
      'SELECT * FROM login_attempts ORDER BY created_at DESC LIMIT ? OFFSET ?'
    )
    .all(pageSize, offset)
  return { list, total, page, pageSize }
}

export function cleanupOldAttempts() {
  const db = getDb()
  const result = db
    .prepare(
      "DELETE FROM login_attempts WHERE created_at < datetime('now', '-1 year')"
    )
    .run()
  return result.changes
}

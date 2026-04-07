import http from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Router } from './utils/router.js'
import { authMiddleware } from './auth/middleware.js'
import { getDb, closeDb } from './db/init.js'
import { Scheduler } from './modules/recurring/scheduler.js'

import { registerAuthRoutes } from './modules/auth/routes.js'
import { registerCategoryRoutes } from './modules/categories/routes.js'
import { registerTransactionRoutes } from './modules/transactions/routes.js'
import { registerRecurringRoutes } from './modules/recurring/routes.js'
import { registerReportRoutes } from './modules/reports/routes.js'
import { registerSettingsRoutes } from './modules/settings/routes.js'
import { registerDataRoutes } from './modules/data/routes.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DIST_DIR = resolve(__dirname, '../../web/dist')
const PORT = Number(process.env.PORT) || 3000
const ALLOWED_ORIGINS = getAllowedOrigins(PORT)

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
}

validateRuntimeConfig(PORT)

const router = new Router()
router.use(authMiddleware)

registerAuthRoutes(router)
registerCategoryRoutes(router)
registerTransactionRoutes(router)
registerRecurringRoutes(router)
registerReportRoutes(router)
registerSettingsRoutes(router)
registerDataRoutes(router)

getDb()

const scheduler = new Scheduler()
scheduler.start()

const server = http.createServer(async (req, res) => {
  setSecurityHeaders(res)
  const originAllowed = setCorsHeaders(req, res)

  if (req.method === 'OPTIONS') {
    res.writeHead(originAllowed ? 204 : 403)
    res.end()
    return
  }

  if (req.headers.origin && !originAllowed && req.url?.startsWith('/api/')) {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ code: 1, message: '不允许的请求来源' }))
    return
  }

  try {
    const handled = await router.handle(req, res)
    if (handled) return
    serveStatic(req, res)
  } catch (e) {
    console.error('Unhandled error:', e)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ code: 1, message: '服务器内部错误' }))
    }
  }
})

function serveStatic(req, res) {
  if (!existsSync(DIST_DIR)) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ code: 1, message: 'Not Found' }))
    return
  }

  const urlObj = new URL(req.url, 'http://localhost')
  let filePath = resolve(DIST_DIR, '.' + decodeURIComponent(urlObj.pathname))

  if (!filePath.startsWith(resolve(DIST_DIR))) {
    res.writeHead(403)
    res.end()
    return
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    filePath = join(DIST_DIR, 'index.html')
  }

  if (!existsSync(filePath)) {
    res.writeHead(404)
    res.end('Not Found')
    return
  }

  const ext = extname(filePath)
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream'
  const content = readFileSync(filePath)

  if (ext !== '.html') {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  }

  res.writeHead(200, { 'Content-Type': mimeType })
  res.end(content)
}

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

process.on('SIGINT', () => {
  scheduler.stop()
  closeDb()
  server.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  scheduler.stop()
  closeDb()
  server.close()
  process.exit(0)
})

function setSecurityHeaders(res) {
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
      "connect-src 'self'"
    ].join('; ')
  )
}

function setCorsHeaders(req, res) {
  const origin = normalizeOrigin(req.headers.origin)
  if (!origin) return true
  if (!ALLOWED_ORIGINS.has(origin)) return false

  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  )
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return true
}

function getAllowedOrigins(port) {
  const configured = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => normalizeOrigin(origin))
    .filter(Boolean)

  if (configured.length > 0) {
    return new Set(configured)
  }

  return new Set([
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ])
}

function normalizeOrigin(origin) {
  if (!origin) return ''

  try {
    return new URL(origin).origin
  } catch {
    return ''
  }
}

function validateRuntimeConfig(port) {
  const errors = []
  const warnings = []

  if (!process.env.ADMIN_USERNAME) {
    errors.push('缺少 ADMIN_USERNAME')
  }

  if (!process.env.JWT_SECRET) {
    errors.push('缺少 JWT_SECRET')
  }

  if (!process.env.ADMIN_PASSWORD && !process.env.ADMIN_PASSWORD_HASH) {
    errors.push('ADMIN_PASSWORD 或 ADMIN_PASSWORD_HASH 至少需要配置一个')
  }

  if (isWeakJwtSecret(process.env.JWT_SECRET)) {
    addSecurityIssue('JWT_SECRET 仍是弱默认值或长度不足 32', errors, warnings)
  }

  if (
    !process.env.ADMIN_PASSWORD_HASH &&
    isWeakAdminPassword(process.env.ADMIN_PASSWORD)
  ) {
    addSecurityIssue('ADMIN_PASSWORD 仍是弱默认值', errors, warnings)
  }

  if (!process.env.ALLOWED_ORIGINS) {
    warnings.push(
      `未显式配置 ALLOWED_ORIGINS，当前仅允许本机来源: http://localhost:${port}, http://127.0.0.1:${port}, http://localhost:5173, http://127.0.0.1:5173`
    )
  }

  for (const message of warnings) {
    console.warn(`[Config] ${message}`)
  }

  if (errors.length > 0) {
    throw new Error(errors.join('；'))
  }
}

function addSecurityIssue(message, errors, warnings) {
  if (process.env.NODE_ENV === 'production') {
    errors.push(message)
    return
  }

  warnings.push(message)
}

function isWeakJwtSecret(secret) {
  const value = String(secret || '').trim().toLowerCase()
  if (!value) return true
  if (value.length < 32) return true

  return [
    'please-change-this-to-a-random-string',
    'changeme',
    'change-me',
    'default-secret'
  ].includes(value)
}

function isWeakAdminPassword(password) {
  const value = String(password || '').trim().toLowerCase()
  if (!value) return false

  return [
    'changeme123',
    'password',
    'password123',
    '12345678',
    'admin123'
  ].includes(value)
}

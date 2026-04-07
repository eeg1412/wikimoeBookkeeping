import crypto from 'node:crypto'

const HASH_PREFIX = 'scrypt'

export function hashPassword(password) {
  const normalized = normalizePassword(password)
  const salt = crypto.randomBytes(16).toString('hex')
  const digest = crypto.scryptSync(normalized, salt, 64).toString('hex')
  return `${HASH_PREFIX}$${salt}$${digest}`
}

export function verifyPassword(inputPassword, plainPassword, passwordHash) {
  const normalized = normalizePassword(inputPassword)

  if (passwordHash) {
    return verifyScryptPassword(normalized, passwordHash)
  }

  if (!plainPassword) {
    return false
  }

  const inputHash = crypto.createHash('sha256').update(normalized).digest()
  const storedHash = crypto.createHash('sha256').update(plainPassword).digest()
  return crypto.timingSafeEqual(inputHash, storedHash)
}

function verifyScryptPassword(password, encodedHash) {
  const [prefix, salt, expectedHex] = String(encodedHash).split('$')
  if (prefix !== HASH_PREFIX || !salt || !expectedHex) {
    return false
  }

  const actual = crypto.scryptSync(password, salt, 64).toString('hex')
  if (actual.length !== expectedHex.length) {
    return false
  }

  return crypto.timingSafeEqual(
    Buffer.from(actual, 'hex'),
    Buffer.from(expectedHex, 'hex')
  )
}

function normalizePassword(password) {
  return String(password || '')
}
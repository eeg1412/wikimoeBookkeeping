import crypto from 'node:crypto'

export function signToken(payload, secret, expiresIn = 7 * 86400) {
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

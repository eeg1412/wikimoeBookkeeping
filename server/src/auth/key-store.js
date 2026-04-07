import crypto from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const JWT_KEY_BYTES = 64
const JWT_KEY_PATH = resolve(process.cwd(), './keys/jwt.key')

let cachedSecret = null

export function getJwtKeyPath() {
  return JWT_KEY_PATH
}

export function getJwtSecret() {
  if (cachedSecret) {
    return cachedSecret
  }

  ensureJwtSecretFile()

  const encodedSecret = readFileSync(JWT_KEY_PATH, 'utf8').trim()
  if (!encodedSecret) {
    throw new Error(`JWT 密钥文件为空，请删除后重新生成: ${JWT_KEY_PATH}`)
  }

  const secret = Buffer.from(encodedSecret, 'base64url')
  if (secret.length < JWT_KEY_BYTES) {
    throw new Error(
      `JWT 密钥文件长度不足 ${JWT_KEY_BYTES} 字节，请删除后重新生成: ${JWT_KEY_PATH}`
    )
  }

  cachedSecret = secret
  return cachedSecret
}

function ensureJwtSecretFile() {
  const keyDir = dirname(JWT_KEY_PATH)
  if (!existsSync(keyDir)) {
    mkdirSync(keyDir, { recursive: true })
  }

  if (existsSync(JWT_KEY_PATH)) {
    return
  }

  const encodedSecret = crypto.randomBytes(JWT_KEY_BYTES).toString('base64url')

  try {
    writeFileSync(JWT_KEY_PATH, `${encodedSecret}\n`, {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx'
    })
    console.info(`[Auth] 已生成 JWT 密钥文件: ${JWT_KEY_PATH}`)
  } catch (error) {
    if (error?.code !== 'EEXIST') {
      throw error
    }
  }
}

const failedAttempts = new Map()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 60 * 60 * 1000 // 1 hour

export function isRateLimited(ip) {
  const now = Date.now()
  const attempts = failedAttempts.get(ip)
  if (!attempts) return false

  // Remove expired entries (sliding window)
  const valid = attempts.filter(t => now - t < WINDOW_MS)
  if (valid.length === 0) {
    failedAttempts.delete(ip)
    return false
  }
  failedAttempts.set(ip, valid)

  return valid.length >= MAX_ATTEMPTS
}

export function recordFailedAttempt(ip) {
  const now = Date.now()
  const attempts = failedAttempts.get(ip) || []
  attempts.push(now)
  // Keep only entries within window
  const valid = attempts.filter(t => now - t < WINDOW_MS)
  failedAttempts.set(ip, valid)
}

export function clearAttempts(ip) {
  failedAttempts.delete(ip)
}

// Periodic cleanup of stale entries
setInterval(
  () => {
    const now = Date.now()
    for (const [ip, attempts] of failedAttempts) {
      const valid = attempts.filter(t => now - t < WINDOW_MS)
      if (valid.length === 0) {
        failedAttempts.delete(ip)
      } else {
        failedAttempts.set(ip, valid)
      }
    }
  },
  10 * 60 * 1000
) // every 10 minutes

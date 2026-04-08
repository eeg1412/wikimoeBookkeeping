/**
 * Get today's date as YYYY-MM-DD string in the user's local timezone.
 * Avoids the toISOString() pitfall which returns UTC date.
 */
export function getLocalToday() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

import { getDb } from '../../db/init.js'
import { CURRENCIES, CATEGORY_ICONS } from '../../db/schema.js'

export function getSettings() {
  const db = getDb()
  const rows = db.prepare('SELECT key, value FROM settings').all()
  const settings = {}
  for (const row of rows) {
    settings[row.key] = row.value
  }
  return settings
}

export function updateSettings(data) {
  const db = getDb()
  const allowed = [
    'default_currency',
    'timezone',
    'theme_color',
    'dark_mode',
    'week_start'
  ]

  for (const [key, value] of Object.entries(data)) {
    if (!allowed.includes(key)) continue
    db.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
    ).run(key, String(value))
  }

  return getSettings()
}

export function getCurrencies() {
  return CURRENCIES
}

export function getCategoryIcons() {
  return CATEGORY_ICONS
}

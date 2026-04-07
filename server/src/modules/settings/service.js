import { getDb } from '../../db/init.js'
import { CURRENCIES } from '../../db/schema.js'
import { CATEGORY_ICON_GROUPS } from '../../constants/icons.js'

let usedCurrencyCodes = null

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

export function initUsedCurrenciesCache() {
  refreshUsedCurrenciesCache()
}

export function refreshUsedCurrenciesCache() {
  const db = getDb()
  usedCurrencyCodes = db
    .prepare(
      `SELECT currency
       FROM transactions
       WHERE is_deleted = 0 AND currency IS NOT NULL AND trim(currency) != ''
       GROUP BY currency
       ORDER BY MAX(date) DESC, MAX(id) DESC, currency ASC`
    )
    .all()
    .map(row => row.currency)

  return usedCurrencyCodes
}

export function getUsedCurrencies() {
  if (!usedCurrencyCodes) {
    refreshUsedCurrenciesCache()
  }

  const currencyMap = new Map(
    CURRENCIES.map(currency => [currency.code, currency])
  )
  return usedCurrencyCodes.map(code => {
    const currency = currencyMap.get(code)
    return currency || { code, name: code, symbol: code }
  })
}

export function getCategoryIcons() {
  return CATEGORY_ICON_GROUPS
}

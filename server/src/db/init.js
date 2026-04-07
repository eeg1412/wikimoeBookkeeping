import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { SCHEMA_SQL, DEFAULT_SETTINGS } from './schema.js'
import {
  DEFAULT_CATEGORY_ICON,
  LEGACY_CATEGORY_ICON_MAP
} from '../constants/icons.js'

let db = null

export function getDb() {
  if (!db) {
    const dbPath = process.env.DB_PATH || './data/bookkeeping.db'
    const dir = dirname(dbPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    db = new DatabaseSync(dbPath)
    initSchema(db)
    migrateCategoryIcons(db)
  }
  return db
}

function initSchema(database) {
  database.exec('PRAGMA journal_mode=WAL')
  database.exec('PRAGMA foreign_keys=ON')

  const statements = SCHEMA_SQL.split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)

  for (const stmt of statements) {
    database.exec(stmt)
  }

  const insertSetting = database.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  )
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    insertSetting.run(key, value)
  }
}

function migrateCategoryIcons(database) {
  const updateIcon = database.prepare(
    "UPDATE categories SET icon = ?, updated_at = datetime('now') WHERE icon = ?"
  )

  for (const [legacyIcon, iconName] of Object.entries(
    LEGACY_CATEGORY_ICON_MAP
  )) {
    updateIcon.run(iconName, legacyIcon)
  }

  database
    .prepare(
      "UPDATE categories SET icon = ?, updated_at = datetime('now') WHERE icon IS NULL OR trim(icon) = ''"
    )
    .run(DEFAULT_CATEGORY_ICON)
}

export function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}

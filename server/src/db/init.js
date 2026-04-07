import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { SCHEMA_SQL, DEFAULT_SETTINGS } from './schema.js'

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

export function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}

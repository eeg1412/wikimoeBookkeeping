import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { SCHEMA_SQL, DEFAULT_SETTINGS } from './schema.js'
import {
  DEFAULT_CATEGORY_ICON,
  LEGACY_CATEGORY_ICON_MAP
} from '../constants/icons.js'
import {
  generateCategoryColor,
  normalizeCategoryColor
} from '../../../shared/category-colors.js'

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
    migrateLegacyCurrencySchema(db)
    initSchema(db)
    migrateCategoryColors(db)
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

function migrateCategoryColors(database) {
  const columns = getTableColumns(database, 'categories')
  if (columns.length === 0) {
    return
  }

  if (!columns.includes('color')) {
    database.exec('ALTER TABLE categories ADD COLUMN color TEXT DEFAULT NULL')
  }

  const parentCategories = database
    .prepare(
      'SELECT id, color FROM categories WHERE is_deleted = 0 AND parent_id IS NULL'
    )
    .all()

  const updateParentColor = database.prepare(
    "UPDATE categories SET color = ?, updated_at = datetime('now') WHERE id = ?"
  )

  for (const category of parentCategories) {
    updateParentColor.run(
      normalizeCategoryColor(category.color, generateCategoryColor()),
      category.id
    )
  }

  database
    .prepare(
      "UPDATE categories SET color = NULL, updated_at = datetime('now') WHERE parent_id IS NOT NULL AND color IS NOT NULL"
    )
    .run()
}

function migrateLegacyCurrencySchema(database) {
  migrateTransactionsTable(database)
  migrateRecurringRulesTable(database)
}

function migrateTransactionsTable(database) {
  const columns = getTableColumns(database, 'transactions')
  if (
    columns.length === 0 ||
    (!columns.includes('exchange_rate') &&
      !columns.includes('converted_amount'))
  ) {
    return
  }

  recreateTable(database, 'transactions', [
    `CREATE TABLE transactions_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL CHECK(amount > 0),
      currency TEXT NOT NULL DEFAULT 'CNY',
      category_id INTEGER NOT NULL,
      note TEXT DEFAULT '',
      source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'recurring', 'import')),
      date TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    )`,
    `INSERT INTO transactions_new
      (id, type, amount, currency, category_id, note, source, date, is_deleted, created_at, updated_at)
     SELECT
      id,
      type,
      amount,
      COALESCE(currency, 'CNY'),
      category_id,
      COALESCE(note, ''),
      COALESCE(source, 'manual'),
      date,
      COALESCE(is_deleted, 0),
      created_at,
      updated_at
     FROM transactions`,
    'DROP TABLE transactions',
    'ALTER TABLE transactions_new RENAME TO transactions'
  ])
}

function migrateRecurringRulesTable(database) {
  const columns = getTableColumns(database, 'recurring_rules')
  if (columns.length === 0 || !columns.includes('exchange_rate')) {
    return
  }

  recreateTable(database, 'recurring_rules', [
    `CREATE TABLE recurring_rules_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL CHECK(amount > 0),
      currency TEXT NOT NULL DEFAULT 'CNY',
      category_id INTEGER NOT NULL,
      note TEXT DEFAULT '',
      frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
      day_of_week INTEGER DEFAULT NULL CHECK(day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
      day_of_month INTEGER DEFAULT NULL CHECK(day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)),
      month_of_year INTEGER DEFAULT NULL CHECK(month_of_year IS NULL OR (month_of_year >= 1 AND month_of_year <= 12)),
      hour INTEGER DEFAULT 0 CHECK(hour >= 0 AND hour <= 23),
      minute INTEGER DEFAULT 0 CHECK(minute >= 0 AND minute <= 59),
      timezone TEXT DEFAULT 'Asia/Shanghai',
      start_date TEXT NOT NULL,
      end_date TEXT DEFAULT NULL,
      is_active INTEGER DEFAULT 1,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    )`,
    `INSERT INTO recurring_rules_new
      (id, name, type, amount, currency, category_id, note, frequency, day_of_week, day_of_month, month_of_year, hour, minute, timezone, start_date, end_date, is_active, is_deleted, created_at, updated_at)
     SELECT
      id,
      name,
      type,
      amount,
      COALESCE(currency, 'CNY'),
      category_id,
      COALESCE(note, ''),
      frequency,
      day_of_week,
      day_of_month,
      month_of_year,
      COALESCE(hour, 0),
      COALESCE(minute, 0),
      COALESCE(timezone, 'Asia/Shanghai'),
      start_date,
      end_date,
      COALESCE(is_active, 1),
      COALESCE(is_deleted, 0),
      created_at,
      updated_at
     FROM recurring_rules`,
    'DROP TABLE recurring_rules',
    'ALTER TABLE recurring_rules_new RENAME TO recurring_rules'
  ])
}

function getTableColumns(database, tableName) {
  return database
    .prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .map(column => column.name)
}

function recreateTable(database, tableName, statements) {
  database.exec('BEGIN')

  try {
    for (const statement of statements) {
      database.exec(statement)
    }
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw new Error(`迁移 ${tableName} 表失败: ${error.message}`)
  }
}

export function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}

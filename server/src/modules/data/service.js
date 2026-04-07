import { getDb } from '../../db/init.js'
import { DEFAULT_SETTINGS } from '../../db/schema.js'
import { refreshUsedCurrenciesCache } from '../settings/service.js'
import {
  DEFAULT_CATEGORY_ICON,
  normalizeCategoryIconName
} from '../../constants/icons.js'
import {
  generateCategoryColor,
  normalizeCategoryColor,
  parseCategoryColor
} from '../../../../shared/category-colors.js'

const IMPORT_LIMITS = {
  categories: 1000,
  transactions: 20000,
  recurring_rules: 2000,
  settings: 100
}

const ALLOWED_TYPES = new Set(['income', 'expense'])
const ALLOWED_FREQUENCIES = new Set(['daily', 'weekly', 'monthly', 'yearly'])
const ALLOWED_TRANSACTION_SOURCES = new Set(['manual', 'recurring', 'import'])
const ALLOWED_SETTING_KEYS = new Set(Object.keys(DEFAULT_SETTINGS))

export function exportData() {
  const db = getDb()
  const categories = db
    .prepare('SELECT * FROM categories WHERE is_deleted = 0')
    .all()
  const transactions = db
    .prepare('SELECT * FROM transactions WHERE is_deleted = 0 ORDER BY date')
    .all()
  const recurring_rules = db
    .prepare('SELECT * FROM recurring_rules WHERE is_deleted = 0')
    .all()
  const settings = db.prepare('SELECT * FROM settings').all()

  return {
    version: '1.0',
    exported_at: new Date().toISOString(),
    data: { categories, transactions, recurring_rules, settings }
  }
}

export function importData(importPayload, mode = 'merge') {
  const db = getDb()
  if (!['merge', 'overwrite'].includes(mode)) {
    throw new Error('导入模式无效')
  }

  assertPlainObject(importPayload, '导入数据')
  const { data } = importPayload
  assertPlainObject(data, '导入数据内容')

  const result = {
    categories: 0,
    transactions: 0,
    recurring_rules: 0,
    settings: 0,
    errors: []
  }

  const categories = Array.isArray(data.categories)
    ? ensureImportArray(data.categories, '分类', IMPORT_LIMITS.categories).map(
        normalizeCategory
      )
    : []
  const transactions = Array.isArray(data.transactions)
    ? ensureImportArray(
        data.transactions,
        '交易',
        IMPORT_LIMITS.transactions
      ).map(normalizeTransaction)
    : []
  const recurringRules = Array.isArray(data.recurring_rules)
    ? ensureImportArray(
        data.recurring_rules,
        '周期规则',
        IMPORT_LIMITS.recurring_rules
      ).map(normalizeRecurringRule)
    : []
  const settings = Array.isArray(data.settings)
    ? ensureImportArray(data.settings, '设置', IMPORT_LIMITS.settings).map(
        normalizeSetting
      )
    : []

  validateUniqueIds(categories, '分类')
  validateUniqueIds(transactions, '交易')
  validateUniqueIds(recurringRules, '周期规则')

  const payloadData = { categories, transactions, recurringRules, settings }
  const finalResult = runInTransaction(db, () =>
    mode === 'overwrite'
      ? overwriteImport(db, payloadData, result)
      : mergeImport(db, payloadData, result)
  )

  refreshUsedCurrenciesCache()
  return finalResult
}

export function exportCSV() {
  const db = getDb()
  const transactions = db
    .prepare(
      `SELECT t.*, c.name as category_name, pc.name as parent_category_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN categories pc ON c.parent_id = pc.id
       WHERE t.is_deleted = 0
       ORDER BY t.date DESC`
    )
    .all()

  const header = '日期,类型,金额,币种,大分类,小分类,备注,来源\n'
  const rows = transactions
    .map(t => {
      const typeStr = t.type === 'income' ? '收入' : '支出'
      const parent = t.parent_category_name || t.category_name
      const child = t.parent_category_name ? t.category_name : ''
      const note = (t.note || '').replace(/[,\n\r]/g, ' ')
      return `${t.date},${typeStr},${t.amount},${t.currency},${parent},${child},${note},${t.source}`
    })
    .join('\n')

  return header + rows
}

function ensureImportArray(value, label, limit) {
  if (!Array.isArray(value)) {
    throw new Error(`${label}必须是数组`)
  }

  if (value.length > limit) {
    throw new Error(`${label}数量超过限制（最大 ${limit} 条）`)
  }

  return value
}

function normalizeCategory(raw) {
  assertPlainObject(raw, '分类项')

  const parentId =
    raw.parent_id == null ? null : toPositiveInteger(raw.parent_id, '父分类 ID')

  return {
    id: toPositiveInteger(raw.id, '分类 ID'),
    name: toShortText(raw.name, '分类名称', 50),
    type: toType(raw.type, '分类类型'),
    parent_id: parentId,
    icon: normalizeCategoryIconName(
      toOptionalText(raw.icon, '分类图标', 16) || DEFAULT_CATEGORY_ICON
    ),
    color: parentId ? null : normalizeImportedCategoryColor(raw.color),
    sort_order:
      toOptionalInteger(raw.sort_order, '分类排序', -999999, 999999) ?? 0
  }
}

function normalizeTransaction(raw) {
  assertPlainObject(raw, '交易项')

  return {
    id: toOptionalPositiveInteger(raw.id, '交易 ID'),
    type: toType(raw.type, '交易类型'),
    amount: toPositiveNumber(raw.amount, '交易金额'),
    currency: toCurrency(raw.currency),
    category_id: toPositiveInteger(raw.category_id, '交易分类 ID'),
    note: toOptionalText(raw.note, '交易备注', 500) || '',
    date: toDate(raw.date, '交易日期'),
    source: toTransactionSource(raw.source)
  }
}

function normalizeRecurringRule(raw) {
  assertPlainObject(raw, '周期规则项')

  const startDate = toDate(raw.start_date, '开始日期')
  const endDate = raw.end_date ? toDate(raw.end_date, '结束日期') : null

  if (endDate && endDate < startDate) {
    throw new Error('结束日期不能早于开始日期')
  }

  return {
    id: toOptionalPositiveInteger(raw.id, '规则 ID'),
    name: toShortText(raw.name, '规则名称', 100),
    type: toType(raw.type, '规则类型'),
    amount: toPositiveNumber(raw.amount, '规则金额'),
    currency: toCurrency(raw.currency),
    category_id: toPositiveInteger(raw.category_id, '规则分类 ID'),
    note: toOptionalText(raw.note, '规则备注', 500) || '',
    frequency: toFrequency(raw.frequency),
    day_of_week: toOptionalInteger(raw.day_of_week, '每周日期', 0, 6),
    day_of_month: toOptionalInteger(raw.day_of_month, '每月日期', 1, 31),
    month_of_year: toOptionalInteger(raw.month_of_year, '每年月份', 1, 12),
    hour: toOptionalInteger(raw.hour, '执行小时', 0, 23) ?? 0,
    minute: toOptionalInteger(raw.minute, '执行分钟', 0, 59) ?? 0,
    timezone: toOptionalText(raw.timezone, '时区', 64) || 'Asia/Shanghai',
    start_date: startDate,
    end_date: endDate
  }
}

function normalizeSetting(raw) {
  assertPlainObject(raw, '设置项')

  const key = String(raw.key || '').trim()
  if (!ALLOWED_SETTING_KEYS.has(key)) {
    throw new Error(`不支持的设置项: ${key || '空值'}`)
  }

  return {
    key,
    value: toOptionalText(raw.value, `设置 ${key}`, 200) || ''
  }
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label}格式无效`)
  }
}

function toType(value, label) {
  const normalized = String(value || '').trim()
  if (!ALLOWED_TYPES.has(normalized)) {
    throw new Error(`${label}无效`)
  }
  return normalized
}

function toFrequency(value) {
  const normalized = String(value || '').trim()
  if (!ALLOWED_FREQUENCIES.has(normalized)) {
    throw new Error('规则频率无效')
  }
  return normalized
}

function toDate(value, label) {
  const text = String(value || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error(`${label}格式无效`)
  }

  const date = new Date(`${text}T00:00:00Z`)
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== text
  ) {
    throw new Error(`${label}格式无效`)
  }

  return text
}

function toCurrency(value) {
  const text = String(value || 'CNY')
    .trim()
    .toUpperCase()
  if (!/^[A-Z]{3,10}$/.test(text)) {
    throw new Error('币种格式无效')
  }
  return text
}

function toPositiveNumber(value, label) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${label}必须大于 0`)
  }
  return number
}

function toPositiveInteger(value, label) {
  const number = Number(value)
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${label}必须是正整数`)
  }
  return number
}

function toOptionalPositiveInteger(value, label) {
  if (value == null || value === '') return null
  return toPositiveInteger(value, label)
}

function toOptionalInteger(value, label, min, max) {
  if (value == null || value === '') return null

  const number = Number(value)
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${label}必须在 ${min} 到 ${max} 之间`)
  }

  return number
}

function toShortText(value, label, maxLength) {
  const text = String(value || '').trim()
  if (!text) {
    throw new Error(`${label}不能为空`)
  }

  if (text.length > maxLength) {
    throw new Error(`${label}长度不能超过 ${maxLength}`)
  }

  return text
}

function toOptionalText(value, label, maxLength) {
  if (value == null) return ''

  const text = String(value).trim()
  if (text.length > maxLength) {
    throw new Error(`${label}长度不能超过 ${maxLength}`)
  }

  return text
}

function toTransactionSource(value) {
  const text = String(value || 'manual').trim()
  if (!ALLOWED_TRANSACTION_SOURCES.has(text)) {
    throw new Error('交易来源无效')
  }
  return text
}

function normalizeImportedCategoryColor(value) {
  const color = toOptionalText(value, '分类颜色', 32)
  if (!color) {
    return generateCategoryColor()
  }

  if (!parseCategoryColor(color)) {
    throw new Error('分类颜色无效')
  }

  return normalizeCategoryColor(color)
}

function validateUniqueIds(items, label) {
  const seen = new Set()

  for (const item of items) {
    if (!item.id) continue
    if (seen.has(item.id)) {
      throw new Error(`${label}存在重复 ID: ${item.id}`)
    }
    seen.add(item.id)
  }
}

function runInTransaction(db, callback) {
  db.exec('BEGIN')

  try {
    const result = callback()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function mergeImport(db, payloadData, result) {
  const categoryIdMap = mergeCategories(db, payloadData.categories, result)
  mergeTransactions(db, payloadData.transactions, categoryIdMap, result)
  mergeRecurringRules(db, payloadData.recurringRules, categoryIdMap, result)
  result.settings = upsertSettings(db, payloadData.settings)
  return result
}

function overwriteImport(db, payloadData, result) {
  clearImportTables(db)

  const categoryIdMap = overwriteCategories(db, payloadData.categories, result)
  overwriteTransactions(db, payloadData.transactions, categoryIdMap, result)
  overwriteRecurringRules(db, payloadData.recurringRules, categoryIdMap, result)
  result.settings = replaceSettings(db, payloadData.settings)

  return result
}

function mergeCategories(db, categories, result) {
  const idMap = new Map()
  const usedIds = getExistingIds(db, 'categories')
  const parents = categories.filter(category => !category.parent_id)
  const children = categories.filter(category => category.parent_id)

  for (const category of parents) {
    const existing = db
      .prepare(
        'SELECT id FROM categories WHERE name = ? AND type = ? AND parent_id IS NULL AND is_deleted = 0'
      )
      .get(category.name, category.type)

    if (existing) {
      idMap.set(category.id, existing.id)
      continue
    }

    const explicitId = claimId(category.id, usedIds)
    const insertedId = insertCategory(db, category, null, explicitId)
    usedIds.add(insertedId)
    idMap.set(category.id, insertedId)
    result.categories++
  }

  for (const category of children) {
    const parentId = idMap.get(category.parent_id)
    if (!parentId) {
      throw new Error(`子分类 "${category.name}" 的父分类不存在`)
    }

    const existing = db
      .prepare(
        'SELECT id FROM categories WHERE name = ? AND type = ? AND parent_id = ? AND is_deleted = 0'
      )
      .get(category.name, category.type, parentId)

    if (existing) {
      idMap.set(category.id, existing.id)
      continue
    }

    const explicitId = claimId(category.id, usedIds)
    const insertedId = insertCategory(db, category, parentId, explicitId)
    usedIds.add(insertedId)
    idMap.set(category.id, insertedId)
    result.categories++
  }

  return idMap
}

function overwriteCategories(db, categories, result) {
  const idMap = new Map()
  const parents = categories.filter(category => !category.parent_id)
  const children = categories.filter(category => category.parent_id)

  for (const category of parents) {
    const insertedId = insertCategory(db, category, null, category.id)
    idMap.set(category.id, insertedId)
    result.categories++
  }

  for (const category of children) {
    const parentId = idMap.get(category.parent_id)
    if (!parentId) {
      throw new Error(`子分类 "${category.name}" 的父分类不存在`)
    }

    const insertedId = insertCategory(db, category, parentId, category.id)
    idMap.set(category.id, insertedId)
    result.categories++
  }

  return idMap
}

function mergeTransactions(db, transactions, categoryIdMap, result) {
  const usedIds = getExistingIds(db, 'transactions')

  for (const transaction of transactions) {
    const categoryId = resolveCategoryId(
      db,
      transaction.category_id,
      categoryIdMap
    )
    const explicitId = claimId(transaction.id, usedIds)
    const insertedId = insertTransaction(
      db,
      transaction,
      categoryId,
      explicitId
    )
    usedIds.add(insertedId)
    result.transactions++
  }
}

function overwriteTransactions(db, transactions, categoryIdMap, result) {
  for (const transaction of transactions) {
    const categoryId = resolveCategoryId(
      db,
      transaction.category_id,
      categoryIdMap
    )
    insertTransaction(db, transaction, categoryId, transaction.id)
    result.transactions++
  }
}

function mergeRecurringRules(db, recurringRules, categoryIdMap, result) {
  const usedIds = getExistingIds(db, 'recurring_rules')

  for (const rule of recurringRules) {
    const categoryId = resolveCategoryId(db, rule.category_id, categoryIdMap)
    const explicitId = claimId(rule.id, usedIds)
    const insertedId = insertRecurringRule(db, rule, categoryId, explicitId)
    usedIds.add(insertedId)
    result.recurring_rules++
  }
}

function overwriteRecurringRules(db, recurringRules, categoryIdMap, result) {
  for (const rule of recurringRules) {
    const categoryId = resolveCategoryId(db, rule.category_id, categoryIdMap)
    insertRecurringRule(db, rule, categoryId, rule.id)
    result.recurring_rules++
  }
}

function upsertSettings(db, settings) {
  for (const item of settings) {
    db.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
    ).run(item.key, item.value)
  }

  return settings.length
}

function replaceSettings(db, settings) {
  for (const item of settings) {
    db.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))"
    ).run(item.key, item.value)
  }

  return settings.length
}

function clearImportTables(db) {
  db.exec('DELETE FROM recurring_logs')
  db.exec('DELETE FROM transactions')
  db.exec('DELETE FROM recurring_rules')
  db.exec('DELETE FROM categories')
  db.exec('DELETE FROM settings')
  db.exec('DELETE FROM login_attempts')
  db.exec(
    "DELETE FROM sqlite_sequence WHERE name IN ('categories', 'transactions', 'recurring_rules', 'recurring_logs', 'login_attempts')"
  )
}

function insertCategory(db, category, parentId, explicitId) {
  if (explicitId) {
    db.prepare(
      `INSERT INTO categories (id, name, type, parent_id, icon, color, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      explicitId,
      category.name,
      category.type,
      parentId,
      normalizeCategoryIconName(category.icon || DEFAULT_CATEGORY_ICON),
      parentId ? null : category.color,
      category.sort_order
    )
    return explicitId
  }

  const result = db
    .prepare(
      `INSERT INTO categories (name, type, parent_id, icon, color, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      category.name,
      category.type,
      parentId,
      normalizeCategoryIconName(category.icon || DEFAULT_CATEGORY_ICON),
      parentId ? null : category.color,
      category.sort_order
    )

  return Number(result.lastInsertRowid)
}

function insertTransaction(db, transaction, categoryId, explicitId) {
  if (explicitId) {
    db.prepare(
      `INSERT INTO transactions (id, type, amount, currency, category_id, note, source, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      explicitId,
      transaction.type,
      transaction.amount,
      transaction.currency,
      categoryId,
      transaction.note,
      transaction.source,
      transaction.date
    )
    return explicitId
  }

  const result = db
    .prepare(
      `INSERT INTO transactions (type, amount, currency, category_id, note, source, date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      transaction.type,
      transaction.amount,
      transaction.currency,
      categoryId,
      transaction.note,
      transaction.source,
      transaction.date
    )

  return Number(result.lastInsertRowid)
}

function insertRecurringRule(db, rule, categoryId, explicitId) {
  const values = [
    rule.name,
    rule.type,
    rule.amount,
    rule.currency,
    categoryId,
    rule.note,
    rule.frequency,
    rule.day_of_week,
    rule.day_of_month,
    rule.month_of_year,
    rule.hour,
    rule.minute,
    rule.timezone,
    rule.start_date,
    rule.end_date
  ]

  if (explicitId) {
    db.prepare(
      `INSERT INTO recurring_rules
       (id, name, type, amount, currency, category_id, note, frequency, day_of_week, day_of_month, month_of_year, hour, minute, timezone, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(explicitId, ...values)
    return explicitId
  }

  const result = db
    .prepare(
      `INSERT INTO recurring_rules
       (name, type, amount, currency, category_id, note, frequency, day_of_week, day_of_month, month_of_year, hour, minute, timezone, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(...values)

  return Number(result.lastInsertRowid)
}

function resolveCategoryId(db, importedCategoryId, categoryIdMap) {
  const categoryId = categoryIdMap.get(importedCategoryId) || importedCategoryId
  const category = db
    .prepare('SELECT id FROM categories WHERE id = ? AND is_deleted = 0')
    .get(categoryId)

  if (!category) {
    throw new Error(`关联分类不存在: ${importedCategoryId}`)
  }

  return categoryId
}

function getExistingIds(db, tableName) {
  return new Set(
    db
      .prepare(`SELECT id FROM ${tableName}`)
      .all()
      .map(row => row.id)
  )
}

function claimId(preferredId, usedIds) {
  if (!preferredId || usedIds.has(preferredId)) {
    return null
  }

  return preferredId
}

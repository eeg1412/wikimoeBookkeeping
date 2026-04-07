import { getDb } from '../../db/init.js'
import { DEFAULT_SETTINGS } from '../../db/schema.js'
import { createCategory } from '../categories/service.js'
import { createTransaction } from '../transactions/service.js'
import { createRule } from '../recurring/service.js'
import { updateSettings } from '../settings/service.js'
import {
  DEFAULT_CATEGORY_ICON,
  normalizeCategoryIconName
} from '../../constants/icons.js'

const IMPORT_LIMITS = {
  categories: 1000,
  transactions: 20000,
  recurring_rules: 2000,
  settings: 100
}

const ALLOWED_TYPES = new Set(['income', 'expense'])
const ALLOWED_FREQUENCIES = new Set(['daily', 'weekly', 'monthly', 'yearly'])
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
  if (!['merge', 'append'].includes(mode)) {
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

  const idMap = {}

  if (categories.length > 0) {
    const parents = categories.filter(category => !category.parent_id)
    const children = categories.filter(category => category.parent_id)

    for (const category of parents) {
      try {
        const existing = db
          .prepare(
            'SELECT id FROM categories WHERE name=? AND type=? AND parent_id IS NULL AND is_deleted=0'
          )
          .get(category.name, category.type)

        if (existing && mode === 'merge') {
          idMap[category.id] = existing.id
        } else {
          const created = createCategory({
            name: category.name,
            type: category.type,
            icon: category.icon,
            sort_order: category.sort_order
          })
          idMap[category.id] = created.id
          result.categories++
        }
      } catch (e) {
        result.errors.push(`分类 "${category.name}": ${e.message}`)
      }
    }

    for (const category of children) {
      try {
        const newParentId = idMap[category.parent_id]
        if (!newParentId) {
          result.errors.push(`子分类 "${category.name}": 父分类未找到`)
          continue
        }

        const existing = db
          .prepare(
            'SELECT id FROM categories WHERE name=? AND type=? AND parent_id=? AND is_deleted=0'
          )
          .get(category.name, category.type, newParentId)

        if (existing && mode === 'merge') {
          idMap[category.id] = existing.id
        } else {
          const created = createCategory({
            name: category.name,
            type: category.type,
            parent_id: newParentId,
            icon: category.icon,
            sort_order: category.sort_order
          })
          idMap[category.id] = created.id
          result.categories++
        }
      } catch (e) {
        result.errors.push(`子分类 "${category.name}": ${e.message}`)
      }
    }
  }

  if (transactions.length > 0) {
    for (const transaction of transactions) {
      try {
        const categoryId =
          idMap[transaction.category_id] || transaction.category_id
        createTransaction({
          type: transaction.type,
          amount: transaction.amount,
          currency: transaction.currency,
          exchange_rate: transaction.exchange_rate,
          category_id: categoryId,
          note: transaction.note,
          date: transaction.date,
          source: 'import'
        })
        result.transactions++
      } catch (e) {
        result.errors.push(
          `交易 ${transaction.date} ${transaction.amount}: ${e.message}`
        )
      }
    }
  }

  if (recurringRules.length > 0) {
    for (const rule of recurringRules) {
      try {
        const categoryId = idMap[rule.category_id] || rule.category_id
        createRule({
          name: rule.name,
          type: rule.type,
          amount: rule.amount,
          currency: rule.currency,
          exchange_rate: rule.exchange_rate,
          category_id: categoryId,
          note: rule.note,
          frequency: rule.frequency,
          day_of_week: rule.day_of_week,
          day_of_month: rule.day_of_month,
          month_of_year: rule.month_of_year,
          hour: rule.hour,
          minute: rule.minute,
          timezone: rule.timezone,
          start_date: rule.start_date,
          end_date: rule.end_date
        })
        result.recurring_rules++
      } catch (e) {
        result.errors.push(`周期规则 "${rule.name}": ${e.message}`)
      }
    }
  }

  if (settings.length > 0) {
    try {
      const nextSettings = Object.fromEntries(
        settings.map(item => [item.key, item.value])
      )
      updateSettings(nextSettings)
      result.settings = Object.keys(nextSettings).length
    } catch (e) {
      result.errors.push(`设置导入失败: ${e.message}`)
    }
  }

  return result
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

  const header = '日期,类型,金额,币种,汇率,折算金额,大分类,小分类,备注,来源\n'
  const rows = transactions
    .map(t => {
      const typeStr = t.type === 'income' ? '收入' : '支出'
      const parent = t.parent_category_name || t.category_name
      const child = t.parent_category_name ? t.category_name : ''
      const note = (t.note || '').replace(/[,\n\r]/g, ' ')
      return `${t.date},${typeStr},${t.amount},${t.currency},${t.exchange_rate},${t.converted_amount},${parent},${child},${note},${t.source}`
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

  return {
    id: toPositiveInteger(raw.id, '分类 ID'),
    name: toShortText(raw.name, '分类名称', 50),
    type: toType(raw.type, '分类类型'),
    parent_id:
      raw.parent_id == null
        ? null
        : toPositiveInteger(raw.parent_id, '父分类 ID'),
    icon: normalizeCategoryIconName(
      toOptionalText(raw.icon, '分类图标', 16) || DEFAULT_CATEGORY_ICON
    ),
    sort_order:
      toOptionalInteger(raw.sort_order, '分类排序', -999999, 999999) ?? 0
  }
}

function normalizeTransaction(raw) {
  assertPlainObject(raw, '交易项')

  return {
    type: toType(raw.type, '交易类型'),
    amount: toPositiveNumber(raw.amount, '交易金额'),
    currency: toCurrency(raw.currency),
    exchange_rate: toPositiveNumber(raw.exchange_rate ?? 1, '交易汇率'),
    category_id: toPositiveInteger(raw.category_id, '交易分类 ID'),
    note: toOptionalText(raw.note, '交易备注', 500) || '',
    date: toDate(raw.date, '交易日期')
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
    name: toShortText(raw.name, '规则名称', 100),
    type: toType(raw.type, '规则类型'),
    amount: toPositiveNumber(raw.amount, '规则金额'),
    currency: toCurrency(raw.currency),
    exchange_rate: toPositiveNumber(raw.exchange_rate ?? 1, '规则汇率'),
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

import { getDb } from '../../db/init.js'
import { refreshUsedCurrenciesCache } from '../settings/service.js'

export function listTransactions({
  page = 1,
  pageSize = 20,
  type,
  category_id,
  date_from,
  date_to,
  currency
} = {}) {
  const db = getDb()
  const where = ['t.is_deleted = 0']
  const params = []

  if (date_from && date_to && date_from > date_to) {
    throw new Error('开始时间不能晚于结束时间')
  }

  if (type) {
    where.push('t.type = ?')
    params.push(type)
  }
  if (category_id) {
    where.push('(t.category_id = ? OR c.parent_id = ?)')
    params.push(category_id, category_id)
  }
  if (date_from) {
    where.push('t.date >= ?')
    params.push(date_from)
  }
  if (date_to) {
    where.push('t.date <= ?')
    params.push(date_to)
  }
  if (currency) {
    where.push('t.currency = ?')
    params.push(currency)
  }

  const whereClause = where.join(' AND ')

  const total = db
    .prepare(
      `SELECT COUNT(*) as count FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE ${whereClause}`
    )
    .get(...params).count

  const offset = (page - 1) * pageSize
  const list = db
    .prepare(
      `SELECT t.*, c.name as category_name, c.icon as category_icon,
              pc.name as parent_category_name, pc.icon as parent_category_icon,
              COALESCE(CASE WHEN c.parent_id IS NULL THEN c.color ELSE pc.color END, c.color) as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN categories pc ON c.parent_id = pc.id
       WHERE ${whereClause}
       ORDER BY t.date DESC, t.id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset)

  return { list, total, page, pageSize }
}

export function getTransaction(id) {
  const db = getDb()
  return db
    .prepare(
      `SELECT t.*, c.name as category_name, c.icon as category_icon,
              pc.name as parent_category_name, pc.icon as parent_category_icon,
              COALESCE(CASE WHEN c.parent_id IS NULL THEN c.color ELSE pc.color END, c.color) as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN categories pc ON c.parent_id = pc.id
       WHERE t.id = ? AND t.is_deleted = 0`
    )
    .get(id)
}

export function createTransaction({
  type,
  amount,
  currency,
  category_id,
  note,
  date,
  source
}) {
  const db = getDb()

  const cat = db
    .prepare('SELECT * FROM categories WHERE id = ? AND is_deleted = 0')
    .get(category_id)
  if (!cat) throw new Error('分类不存在')
  if (cat.type !== type) throw new Error('分类类型与账目类型不一致')

  const result = db
    .prepare(
      `INSERT INTO transactions (type, amount, currency, category_id, note, source, date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      type,
      amount,
      currency || 'CNY',
      category_id,
      note || '',
      source || 'manual',
      date
    )

  refreshUsedCurrenciesCache()

  return getTransaction(Number(result.lastInsertRowid))
}

export function updateTransaction(
  id,
  { type, amount, currency, category_id, note, date }
) {
  const db = getDb()
  const txn = getTransaction(id)
  if (!txn) throw new Error('账目不存在')

  const nextType = type ?? txn.type
  if (nextType !== txn.type) {
    throw new Error('编辑账目时不能切换收入和支出类型')
  }

  const nextCategoryId = category_id ?? txn.category_id
  const nextCategory = db
    .prepare('SELECT * FROM categories WHERE id = ? AND is_deleted = 0')
    .get(nextCategoryId)

  if (!nextCategory) {
    throw new Error('分类不存在')
  }

  if (nextCategory.type !== nextType) {
    throw new Error('分类类型与账目类型不一致')
  }

  const newAmount = amount ?? txn.amount

  db.prepare(
    `UPDATE transactions SET type=?, amount=?, currency=?, category_id=?, note=?, date=?, updated_at=datetime('now')
     WHERE id = ?`
  ).run(
    nextType,
    newAmount,
    currency ?? txn.currency,
    nextCategoryId,
    note ?? txn.note,
    date ?? txn.date,
    id
  )

  refreshUsedCurrenciesCache()

  return getTransaction(id)
}

export function deleteTransaction(id) {
  const db = getDb()
  const txn = getTransaction(id)
  if (!txn) throw new Error('账目不存在')

  db.prepare(
    "UPDATE transactions SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?"
  ).run(id)

  refreshUsedCurrenciesCache()
}

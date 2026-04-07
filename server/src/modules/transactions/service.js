import { getDb } from '../../db/init.js'

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
              pc.name as parent_category_name, pc.icon as parent_category_icon
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
              pc.name as parent_category_name, pc.icon as parent_category_icon
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
  exchange_rate,
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

  const rate = exchange_rate || 1
  const converted_amount = Math.round(amount * rate * 100) / 100

  const result = db
    .prepare(
      `INSERT INTO transactions (type, amount, currency, exchange_rate, converted_amount, category_id, note, source, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      type,
      amount,
      currency || 'CNY',
      rate,
      converted_amount,
      category_id,
      note || '',
      source || 'manual',
      date
    )

  return getTransaction(Number(result.lastInsertRowid))
}

export function updateTransaction(
  id,
  { type, amount, currency, exchange_rate, category_id, note, date }
) {
  const db = getDb()
  const txn = getTransaction(id)
  if (!txn) throw new Error('账目不存在')

  const newAmount = amount ?? txn.amount
  const newRate = exchange_rate ?? txn.exchange_rate
  const converted_amount = Math.round(newAmount * newRate * 100) / 100

  db.prepare(
    `UPDATE transactions SET type=?, amount=?, currency=?, exchange_rate=?,
     converted_amount=?, category_id=?, note=?, date=?, updated_at=datetime('now')
     WHERE id = ?`
  ).run(
    type ?? txn.type,
    newAmount,
    currency ?? txn.currency,
    newRate,
    converted_amount,
    category_id ?? txn.category_id,
    note ?? txn.note,
    date ?? txn.date,
    id
  )

  return getTransaction(id)
}

export function deleteTransaction(id) {
  const db = getDb()
  const txn = getTransaction(id)
  if (!txn) throw new Error('账目不存在')

  db.prepare(
    "UPDATE transactions SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?"
  ).run(id)
}

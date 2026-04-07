import { getDb } from '../../db/init.js'
import { createTransaction } from '../transactions/service.js'

export function listRules() {
  const db = getDb()
  return db
    .prepare(
      `SELECT r.*, c.name as category_name, c.icon as category_icon,
              COALESCE(CASE WHEN c.parent_id IS NULL THEN c.color ELSE pc.color END, c.color) as category_color
       FROM recurring_rules r
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN categories pc ON c.parent_id = pc.id
       WHERE r.is_deleted = 0
       ORDER BY r.created_at DESC`
    )
    .all()
}

export function getRule(id) {
  const db = getDb()
  return db
    .prepare(
      `SELECT r.*, c.name as category_name, c.icon as category_icon,
              COALESCE(CASE WHEN c.parent_id IS NULL THEN c.color ELSE pc.color END, c.color) as category_color
       FROM recurring_rules r
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN categories pc ON c.parent_id = pc.id
       WHERE r.id = ? AND r.is_deleted = 0`
    )
    .get(id)
}

export function createRule({
  name,
  type,
  amount,
  currency,
  category_id,
  note,
  frequency,
  day_of_week,
  day_of_month,
  month_of_year,
  hour,
  minute,
  timezone,
  start_date,
  end_date
}) {
  const db = getDb()

  const cat = db
    .prepare('SELECT * FROM categories WHERE id = ? AND is_deleted = 0')
    .get(category_id)
  if (!cat) throw new Error('分类不存在')

  const result = db
    .prepare(
      `INSERT INTO recurring_rules
       (name, type, amount, currency, category_id, note,
        frequency, day_of_week, day_of_month, month_of_year, hour, minute,
        timezone, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name,
      type,
      amount,
      currency || 'CNY',
      category_id,
      note || '',
      frequency,
      day_of_week ?? null,
      day_of_month ?? null,
      month_of_year ?? null,
      hour ?? 0,
      minute ?? 0,
      timezone || 'Asia/Shanghai',
      start_date,
      end_date || null
    )

  return getRule(Number(result.lastInsertRowid))
}

export function updateRule(id, data) {
  const db = getDb()
  const rule = getRule(id)
  if (!rule) throw new Error('规则不存在')

  db.prepare(
    `UPDATE recurring_rules SET
     name=?, type=?, amount=?, currency=?, category_id=?, note=?,
     frequency=?, day_of_week=?, day_of_month=?, month_of_year=?, hour=?, minute=?,
     timezone=?, start_date=?, end_date=?, is_active=?, updated_at=datetime('now')
     WHERE id=?`
  ).run(
    data.name ?? rule.name,
    data.type ?? rule.type,
    data.amount ?? rule.amount,
    data.currency ?? rule.currency,
    data.category_id ?? rule.category_id,
    data.note ?? rule.note,
    data.frequency ?? rule.frequency,
    data.day_of_week ?? rule.day_of_week,
    data.day_of_month ?? rule.day_of_month,
    data.month_of_year ?? rule.month_of_year,
    data.hour ?? rule.hour,
    data.minute ?? rule.minute,
    data.timezone ?? rule.timezone,
    data.start_date ?? rule.start_date,
    data.end_date ?? rule.end_date,
    data.is_active !== undefined ? data.is_active : rule.is_active,
    id
  )

  return getRule(id)
}

export function deleteRule(id) {
  const db = getDb()
  const rule = getRule(id)
  if (!rule) throw new Error('规则不存在')

  db.prepare(
    "UPDATE recurring_rules SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?"
  ).run(id)
}

export function getRuleLogs(ruleId, { page = 1, pageSize = 20 } = {}) {
  const db = getDb()
  const total = db
    .prepare('SELECT COUNT(*) as count FROM recurring_logs WHERE rule_id = ?')
    .get(ruleId).count

  const offset = (page - 1) * pageSize
  const list = db
    .prepare(
      'SELECT * FROM recurring_logs WHERE rule_id = ? ORDER BY scheduled_date DESC LIMIT ? OFFSET ?'
    )
    .all(ruleId, pageSize, offset)

  return { list, total, page, pageSize }
}

export function executeRule(rule, scheduledDate) {
  const db = getDb()

  const existing = db
    .prepare(
      'SELECT * FROM recurring_logs WHERE rule_id = ? AND scheduled_date = ?'
    )
    .get(rule.id, scheduledDate)

  if (existing) return null

  try {
    const txn = createTransaction({
      type: rule.type,
      amount: rule.amount,
      currency: rule.currency,
      category_id: rule.category_id,
      note: `[周期] ${rule.name}${rule.note ? ' - ' + rule.note : ''}`,
      date: scheduledDate,
      source: 'recurring'
    })

    db.prepare(
      'INSERT INTO recurring_logs (rule_id, scheduled_date, transaction_id, status) VALUES (?, ?, ?, ?)'
    ).run(rule.id, scheduledDate, txn.id, 'completed')

    console.log(`[Scheduler] Rule "${rule.name}" executed for ${scheduledDate}`)
    return txn
  } catch (e) {
    db.prepare(
      "INSERT OR IGNORE INTO recurring_logs (rule_id, scheduled_date, status, error_message) VALUES (?, ?, 'failed', ?)"
    ).run(rule.id, scheduledDate, e.message)
    console.error(
      `[Scheduler] Rule "${rule.name}" failed for ${scheduledDate}: ${e.message}`
    )
    return null
  }
}

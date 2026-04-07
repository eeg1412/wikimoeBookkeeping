import { getDb } from '../../db/init.js'

export function getSummary({ period, date, currency }) {
  const db = getDb()
  const { start, end } = getDateRange(period, date)

  const income = getTypeSummary(db, 'income', start, end, currency)
  const expense = getTypeSummary(db, 'expense', start, end, currency)

  return {
    period,
    start,
    end,
    currency: currency || null,
    income: income.total || 0,
    expense: expense.total || 0,
    net: (income.total || 0) - (expense.total || 0),
    income_count: income.count || 0,
    expense_count: expense.count || 0
  }
}

export function getTrend({ period, start_date, end_date, type, currency }) {
  const db = getDb()
  const buckets = getTimeBuckets(period, start_date, end_date)

  return buckets.map(({ start, end, label }) => {
    const params = [start, end]
    const where = ['date>=?', 'date<=?', 'is_deleted=0']

    if (type) {
      where.push('type=?')
      params.push(type)
    }

    if (currency) {
      where.push('currency=?')
      params.push(currency)
    }

    const totals = db
      .prepare(
        `SELECT type, COALESCE(SUM(amount), 0) as total
         FROM transactions
         WHERE ${where.join(' AND ')}
         GROUP BY type`
      )
      .all(...params)

    const income = totals.find(item => item.type === 'income')?.total || 0
    const expense = totals.find(item => item.type === 'expense')?.total || 0

    return {
      label,
      start,
      end,
      currency: currency || null,
      income,
      expense,
      net: income - expense
    }
  })
}

export function getCategoryReport({
  period,
  date,
  type = 'expense',
  currency
}) {
  const db = getDb()
  const { start, end } = getDateRange(period, date)
  const params = [type, start, end]
  const currencyClause = currency ? 'AND t.currency = ?' : ''

  if (currency) {
    params.push(currency)
  }

  const data = db
    .prepare(
      `SELECT c.id, c.name, c.icon, c.parent_id,
              COALESCE(CASE WHEN c.parent_id IS NULL THEN c.color ELSE pc.color END, c.color) as color,
              pc.name as parent_name, pc.icon as parent_icon,
              SUM(t.amount) as total, COUNT(*) as count
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       LEFT JOIN categories pc ON c.parent_id = pc.id
       WHERE t.type=? AND t.date>=? AND t.date<=? AND t.is_deleted=0 ${currencyClause}
       GROUP BY c.id
       ORDER BY total DESC`
    )
    .all(...params)

  const grandTotal = data.reduce((s, r) => s + r.total, 0)

  return {
    period,
    start,
    end,
    type,
    currency: currency || null,
    categories: data.map(r => ({
      ...r,
      percentage:
        grandTotal > 0 ? +((r.total / grandTotal) * 100).toFixed(1) : 0
    })),
    total: grandTotal
  }
}

function getTypeSummary(db, type, start, end, currency) {
  const params = [start, end]
  const currencyClause = currency ? 'AND currency = ?' : ''
  if (currency) {
    params.push(currency)
  }

  return db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
       FROM transactions
       WHERE type=? AND date>=? AND date<=? AND is_deleted=0 ${currencyClause}`
    )
    .get(type, ...params)
}

function getDateRange(period, dateStr) {
  const date = dateStr ? new Date(dateStr + 'T00:00:00') : new Date()
  const y = date.getFullYear()
  const m = date.getMonth()
  const d = date.getDate()

  switch (period) {
    case 'day': {
      const s = fmt(date)
      return { start: s, end: s }
    }
    case 'week': {
      const db = getDb()
      const ws = db
        .prepare("SELECT value FROM settings WHERE key='week_start'")
        .get()
      const weekStart = ws ? Number(ws.value) : 1
      const dow = date.getDay()
      const diff = (dow - weekStart + 7) % 7
      const s = new Date(y, m, d - diff)
      const e = new Date(y, m, d - diff + 6)
      return { start: fmt(s), end: fmt(e) }
    }
    case 'month':
      return {
        start: `${y}-${String(m + 1).padStart(2, '0')}-01`,
        end: `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`
      }
    case 'year':
      return { start: `${y}-01-01`, end: `${y}-12-31` }
    default:
      throw new Error('无效的统计周期')
  }
}

function getTimeBuckets(period, startDate, endDate) {
  const buckets = []
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')

  switch (period) {
    case 'day': {
      const cur = new Date(start)
      while (cur <= end) {
        const s = fmt(cur)
        buckets.push({ start: s, end: s, label: s.slice(5) })
        cur.setDate(cur.getDate() + 1)
      }
      break
    }
    case 'week': {
      const cur = new Date(start)
      while (cur <= end) {
        const we = new Date(cur)
        we.setDate(we.getDate() + 6)
        const ae = we > end ? end : we
        buckets.push({
          start: fmt(cur),
          end: fmt(ae),
          label: `${fmt(cur).slice(5)}~${fmt(ae).slice(5)}`
        })
        cur.setDate(cur.getDate() + 7)
      }
      break
    }
    case 'month': {
      let cy = start.getFullYear(),
        cm = start.getMonth()
      const ey = end.getFullYear(),
        em = end.getMonth()
      while (cy < ey || (cy === ey && cm <= em)) {
        const s = `${cy}-${String(cm + 1).padStart(2, '0')}-01`
        const e = `${cy}-${String(cm + 1).padStart(2, '0')}-${String(new Date(cy, cm + 1, 0).getDate()).padStart(2, '0')}`
        buckets.push({
          start: s,
          end: e,
          label: `${cy}-${String(cm + 1).padStart(2, '0')}`
        })
        cm++
        if (cm > 11) {
          cm = 0
          cy++
        }
      }
      break
    }
    case 'year': {
      for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
        buckets.push({
          start: `${y}-01-01`,
          end: `${y}-12-31`,
          label: String(y)
        })
      }
      break
    }
  }
  return buckets
}

function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

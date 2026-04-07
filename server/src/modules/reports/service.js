import { getDb } from '../../db/init.js'

export function getSummary({ period, date, currency_mode = 'default' }) {
  const db = getDb()
  const { start, end } = getDateRange(period, date)

  if (currency_mode === 'original') {
    const income = db
      .prepare(
        `SELECT currency, SUM(amount) as total, COUNT(*) as count
         FROM transactions WHERE type='income' AND date>=? AND date<=? AND is_deleted=0
         GROUP BY currency`
      )
      .all(start, end)
    const expense = db
      .prepare(
        `SELECT currency, SUM(amount) as total, COUNT(*) as count
         FROM transactions WHERE type='expense' AND date>=? AND date<=? AND is_deleted=0
         GROUP BY currency`
      )
      .all(start, end)
    return { period, start, end, currency_mode, income, expense }
  }

  const income = db
    .prepare(
      `SELECT SUM(converted_amount) as total, COUNT(*) as count
       FROM transactions WHERE type='income' AND date>=? AND date<=? AND is_deleted=0`
    )
    .get(start, end)
  const expense = db
    .prepare(
      `SELECT SUM(converted_amount) as total, COUNT(*) as count
       FROM transactions WHERE type='expense' AND date>=? AND date<=? AND is_deleted=0`
    )
    .get(start, end)

  return {
    period,
    start,
    end,
    currency_mode,
    income: income.total || 0,
    expense: expense.total || 0,
    net: (income.total || 0) - (expense.total || 0),
    income_count: income.count || 0,
    expense_count: expense.count || 0
  }
}

export function getTrend({
  period,
  start_date,
  end_date,
  type,
  currency_mode = 'default'
}) {
  const db = getDb()
  const buckets = getTimeBuckets(period, start_date, end_date)

  return buckets.map(({ start, end, label }) => {
    if (currency_mode === 'original') {
      const data = db
        .prepare(
          `SELECT currency, type, SUM(amount) as total
           FROM transactions WHERE date>=? AND date<=? AND is_deleted=0
           ${type ? 'AND type=?' : ''}
           GROUP BY currency, type`
        )
        .all(...(type ? [start, end, type] : [start, end]))
      return { label, start, end, data }
    }

    const inc = db
      .prepare(
        `SELECT COALESCE(SUM(converted_amount),0) as total FROM transactions
         WHERE type='income' AND date>=? AND date<=? AND is_deleted=0`
      )
      .get(start, end)
    const exp = db
      .prepare(
        `SELECT COALESCE(SUM(converted_amount),0) as total FROM transactions
         WHERE type='expense' AND date>=? AND date<=? AND is_deleted=0`
      )
      .get(start, end)

    return {
      label,
      start,
      end,
      income: inc.total,
      expense: exp.total,
      net: inc.total - exp.total
    }
  })
}

export function getCategoryReport({
  period,
  date,
  type = 'expense',
  currency_mode = 'default'
}) {
  const db = getDb()
  const { start, end } = getDateRange(period, date)
  const amountField =
    currency_mode === 'original' ? 'amount' : 'converted_amount'
  const extraGroup = currency_mode === 'original' ? 't.currency,' : ''
  const extraSelect = currency_mode === 'original' ? 't.currency,' : ''

  const data = db
    .prepare(
      `SELECT c.id, c.name, c.icon, c.parent_id,
              pc.name as parent_name, pc.icon as parent_icon,
              ${extraSelect}
              SUM(t.${amountField}) as total, COUNT(*) as count
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       LEFT JOIN categories pc ON c.parent_id = pc.id
       WHERE t.type=? AND t.date>=? AND t.date<=? AND t.is_deleted=0
       GROUP BY ${extraGroup} c.id
       ORDER BY total DESC`
    )
    .all(type, start, end)

  const grandTotal = data.reduce((s, r) => s + r.total, 0)

  return {
    period,
    start,
    end,
    type,
    currency_mode,
    categories: data.map(r => ({
      ...r,
      percentage:
        grandTotal > 0 ? +((r.total / grandTotal) * 100).toFixed(1) : 0
    })),
    total: grandTotal
  }
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

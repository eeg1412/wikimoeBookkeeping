import { getDb } from '../../db/init.js'
import { executeRule } from './service.js'
import { cleanupOldAttempts } from '../auth/loginAttempts.js'

export class Scheduler {
  constructor() {
    this.timer = null
    this.running = false
    this.interval = 30000
    this._lastCleanupDate = null
  }

  start() {
    console.log('[Scheduler] Started, checking every 30s')
    this.tick()
    this.timer = setInterval(() => this.tick(), this.interval)
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    console.log('[Scheduler] Stopped')
  }

  tick() {
    if (this.running) return
    this.running = true
    try {
      this._processRules()
      this._dailyCleanup()
    } catch (e) {
      console.error('[Scheduler] Error:', e.message)
    } finally {
      this.running = false
    }
  }

  _dailyCleanup() {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const hour = now.getHours()

    // Run once per day after 3am
    if (hour >= 3 && this._lastCleanupDate !== todayStr) {
      this._lastCleanupDate = todayStr
      try {
        const deleted = cleanupOldAttempts()
        if (deleted > 0) {
          console.log(`[Scheduler] Cleaned up ${deleted} old login attempts`)
        }
      } catch (e) {
        console.error('[Scheduler] Cleanup error:', e.message)
      }
    }
  }

  _processRules() {
    const db = getDb()
    const rules = db
      .prepare(
        'SELECT * FROM recurring_rules WHERE is_active = 1 AND is_deleted = 0'
      )
      .all()

    for (const rule of rules) {
      try {
        const dates = this._getScheduledDates(rule)
        for (const date of dates) {
          executeRule(rule, date)
        }
      } catch (e) {
        console.error(`[Scheduler] Rule ${rule.id} error:`, e.message)
      }
    }
  }

  _getScheduledDates(rule) {
    const tz = rule.timezone || 'Asia/Shanghai'
    const now = this._getLocalTime(tz)
    const nowStr = `${now.year}-${String(now.month).padStart(2, '0')}-${String(now.day).padStart(2, '0')}`

    if (nowStr < rule.start_date) return []
    if (rule.end_date && nowStr > rule.end_date) return []

    const dates = []
    const compensateDays = 30
    const startCheck = this._maxDate(
      rule.start_date,
      this._addDays(nowStr, -compensateDays)
    )

    switch (rule.frequency) {
      case 'daily':
        this._addDailyDates(rule, startCheck, nowStr, now, dates)
        break
      case 'weekly':
        this._addWeeklyDates(rule, startCheck, nowStr, now, tz, dates)
        break
      case 'monthly':
        this._addMonthlyDates(rule, startCheck, nowStr, now, dates)
        break
      case 'yearly':
        this._addYearlyDates(rule, startCheck, nowStr, now, dates)
        break
    }

    if (rule.end_date) {
      return dates.filter(d => d <= rule.end_date)
    }
    return dates
  }

  _shouldFireToday(now, rule, dateStr, todayStr) {
    if (dateStr < todayStr) return true
    return (
      now.hour > rule.hour ||
      (now.hour === rule.hour && now.minute >= rule.minute)
    )
  }

  _addDailyDates(rule, startDate, endDate, now, dates) {
    let current = startDate
    while (current <= endDate) {
      if (this._shouldFireToday(now, rule, current, endDate)) {
        dates.push(current)
      }
      current = this._addDays(current, 1)
    }
  }

  _addWeeklyDates(rule, startDate, endDate, now, tz, dates) {
    let current = startDate
    while (current <= endDate) {
      const dow = this._getDayOfWeek(current, tz)
      if (dow === rule.day_of_week) {
        if (this._shouldFireToday(now, rule, current, endDate)) {
          dates.push(current)
        }
      }
      current = this._addDays(current, 1)
    }
  }

  _addMonthlyDates(rule, startDate, endDate, now, dates) {
    const [sy, sm] = startDate.split('-').map(Number)
    const [ey, em] = endDate.split('-').map(Number)

    let year = sy
    let month = sm
    while (year < ey || (year === ey && month <= em)) {
      const day = this._clampDay(rule.day_of_month, year, month)
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      if (dateStr >= startDate && dateStr <= endDate) {
        if (this._shouldFireToday(now, rule, dateStr, endDate)) {
          dates.push(dateStr)
        }
      }

      month++
      if (month > 12) {
        month = 1
        year++
      }
    }
  }

  _addYearlyDates(rule, startDate, endDate, now, dates) {
    const [sy] = startDate.split('-').map(Number)
    const [ey] = endDate.split('-').map(Number)

    for (let year = sy; year <= ey; year++) {
      const m = rule.month_of_year || 1
      const day = this._clampDay(rule.day_of_month || 1, year, m)
      const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      if (dateStr >= startDate && dateStr <= endDate) {
        if (this._shouldFireToday(now, rule, dateStr, endDate)) {
          dates.push(dateStr)
        }
      }
    }
  }

  _getLocalTime(timezone) {
    const now = new Date()
    const parts = {}
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'short'
    })
    for (const { type, value } of fmt.formatToParts(now)) {
      parts[type] = value
    }
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      hour: Number(parts.hour === '24' ? 0 : parts.hour),
      minute: Number(parts.minute),
      dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
        parts.weekday
      )
    }
  }

  _getDayOfWeek(dateStr, timezone) {
    const date = new Date(dateStr + 'T12:00:00Z')
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short'
    })
    const weekday = fmt.format(date)
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday)
  }

  _clampDay(day, year, month) {
    const daysInMonth = new Date(year, month, 0).getDate()
    return Math.min(day, daysInMonth)
  }

  _addDays(dateStr, days) {
    const d = new Date(dateStr + 'T12:00:00Z')
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().split('T')[0]
  }

  _maxDate(a, b) {
    return a > b ? a : b
  }
}

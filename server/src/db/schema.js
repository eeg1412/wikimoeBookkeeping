import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '../constants/icons.js'

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  parent_id INTEGER DEFAULT NULL,
  icon TEXT DEFAULT '${DEFAULT_CATEGORY_ICON}',
  sort_order INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  amount REAL NOT NULL CHECK(amount > 0),
  currency TEXT NOT NULL DEFAULT 'CNY',
  exchange_rate REAL NOT NULL DEFAULT 1 CHECK(exchange_rate > 0),
  converted_amount REAL NOT NULL,
  category_id INTEGER NOT NULL,
  note TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'recurring', 'import')),
  date TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS recurring_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  amount REAL NOT NULL CHECK(amount > 0),
  currency TEXT NOT NULL DEFAULT 'CNY',
  exchange_rate REAL NOT NULL DEFAULT 1 CHECK(exchange_rate > 0),
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
);

CREATE TABLE IF NOT EXISTS recurring_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id INTEGER NOT NULL,
  scheduled_date TEXT NOT NULL,
  transaction_id INTEGER DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'failed', 'skipped')),
  error_message TEXT DEFAULT NULL,
  executed_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (rule_id) REFERENCES recurring_rules(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
  UNIQUE(rule_id, scheduled_date)
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  success INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, date) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_rules(is_active) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_recurring_logs_rule ON recurring_logs(rule_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip, created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts(created_at);
`

export const DEFAULT_SETTINGS = {
  default_currency: 'CNY',
  timezone: 'Asia/Shanghai',
  theme_color: 'blue',
  dark_mode: 'system',
  week_start: '1'
}

export const CURRENCIES = [
  { code: 'CNY', name: '人民币', symbol: '¥' },
  { code: 'USD', name: '美元', symbol: '$' },
  { code: 'EUR', name: '欧元', symbol: '€' },
  { code: 'GBP', name: '英镑', symbol: '£' },
  { code: 'JPY', name: '日元', symbol: '¥' },
  { code: 'HKD', name: '港币', symbol: 'HK$' },
  { code: 'TWD', name: '新台币', symbol: 'NT$' },
  { code: 'KRW', name: '韩元', symbol: '₩' },
  { code: 'SGD', name: '新加坡元', symbol: 'S$' },
  { code: 'AUD', name: '澳元', symbol: 'A$' },
  { code: 'CAD', name: '加元', symbol: 'C$' },
  { code: 'CHF', name: '瑞士法郎', symbol: 'CHF' },
  { code: 'THB', name: '泰铢', symbol: '฿' },
  { code: 'MYR', name: '林吉特', symbol: 'RM' },
  { code: 'INR', name: '印度卢比', symbol: '₹' },
  { code: 'RUB', name: '俄罗斯卢布', symbol: '₽' }
]

export { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON }

import { randomUUID } from 'node:crypto'

export const CATEGORY_OPERATION_LOCK_KEY = 'category-delete-write'
export const CATEGORY_DELETE_WRITE_LOCK_MESSAGE =
  '分类删除处理中，暂时禁止写入账目或周期规则，请稍后重试'
const CATEGORY_DELETE_LOCK_BUSY_MESSAGE =
  '当前已有分类删除操作正在进行，请稍后再试'
const CATEGORY_DELETE_LOCK_TTL_SECONDS = 120

export function initCategoryOperationLockSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS category_operation_locks (
      lock_key TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      source_category_id INTEGER NOT NULL,
      target_category_id INTEGER DEFAULT NULL,
      reason TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_category_operation_locks_expires
    ON category_operation_locks(expires_at)
  `)

  database.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_transactions_block_insert_during_category_delete
    BEFORE INSERT ON transactions
    WHEN EXISTS (
      SELECT 1
      FROM category_operation_locks
      WHERE lock_key = '${CATEGORY_OPERATION_LOCK_KEY}'
        AND expires_at > datetime('now')
    )
    BEGIN
      SELECT RAISE(ABORT, '${CATEGORY_DELETE_WRITE_LOCK_MESSAGE}');
    END;
  `)

  database.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_transactions_block_update_during_category_delete
    BEFORE UPDATE ON transactions
    WHEN EXISTS (
      SELECT 1
      FROM category_operation_locks
      WHERE lock_key = '${CATEGORY_OPERATION_LOCK_KEY}'
        AND expires_at > datetime('now')
        AND NOT (
          target_category_id IS NOT NULL
          AND OLD.category_id = source_category_id
          AND NEW.category_id = target_category_id
          AND OLD.type = NEW.type
          AND OLD.amount = NEW.amount
          AND OLD.currency = NEW.currency
          AND OLD.note = NEW.note
          AND OLD.source = NEW.source
          AND OLD.date = NEW.date
          AND OLD.is_deleted = NEW.is_deleted
          AND OLD.created_at = NEW.created_at
        )
    )
    BEGIN
      SELECT RAISE(ABORT, '${CATEGORY_DELETE_WRITE_LOCK_MESSAGE}');
    END;
  `)

  database.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_transactions_block_delete_during_category_delete
    BEFORE DELETE ON transactions
    WHEN EXISTS (
      SELECT 1
      FROM category_operation_locks
      WHERE lock_key = '${CATEGORY_OPERATION_LOCK_KEY}'
        AND expires_at > datetime('now')
    )
    BEGIN
      SELECT RAISE(ABORT, '${CATEGORY_DELETE_WRITE_LOCK_MESSAGE}');
    END;
  `)

  database.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_recurring_rules_block_insert_during_category_delete
    BEFORE INSERT ON recurring_rules
    WHEN EXISTS (
      SELECT 1
      FROM category_operation_locks
      WHERE lock_key = '${CATEGORY_OPERATION_LOCK_KEY}'
        AND expires_at > datetime('now')
    )
    BEGIN
      SELECT RAISE(ABORT, '${CATEGORY_DELETE_WRITE_LOCK_MESSAGE}');
    END;
  `)

  database.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_recurring_rules_block_update_during_category_delete
    BEFORE UPDATE ON recurring_rules
    WHEN EXISTS (
      SELECT 1
      FROM category_operation_locks
      WHERE lock_key = '${CATEGORY_OPERATION_LOCK_KEY}'
        AND expires_at > datetime('now')
        AND NOT (
          target_category_id IS NOT NULL
          AND OLD.category_id = source_category_id
          AND NEW.category_id = target_category_id
          AND OLD.name = NEW.name
          AND OLD.type = NEW.type
          AND OLD.amount = NEW.amount
          AND OLD.currency = NEW.currency
          AND OLD.note = NEW.note
          AND OLD.frequency = NEW.frequency
          AND OLD.day_of_week IS NEW.day_of_week
          AND OLD.day_of_month IS NEW.day_of_month
          AND OLD.month_of_year IS NEW.month_of_year
          AND OLD.hour = NEW.hour
          AND OLD.minute = NEW.minute
          AND OLD.timezone = NEW.timezone
          AND OLD.start_date = NEW.start_date
          AND OLD.end_date IS NEW.end_date
          AND OLD.is_active = NEW.is_active
          AND OLD.is_deleted = NEW.is_deleted
          AND OLD.created_at = NEW.created_at
        )
    )
    BEGIN
      SELECT RAISE(ABORT, '${CATEGORY_DELETE_WRITE_LOCK_MESSAGE}');
    END;
  `)

  database.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_recurring_rules_block_delete_during_category_delete
    BEFORE DELETE ON recurring_rules
    WHEN EXISTS (
      SELECT 1
      FROM category_operation_locks
      WHERE lock_key = '${CATEGORY_OPERATION_LOCK_KEY}'
        AND expires_at > datetime('now')
    )
    BEGIN
      SELECT RAISE(ABORT, '${CATEGORY_DELETE_WRITE_LOCK_MESSAGE}');
    END;
  `)
}

export function clearExpiredCategoryOperationLocks(database) {
  database
    .prepare(
      "DELETE FROM category_operation_locks WHERE expires_at <= datetime('now')"
    )
    .run()
}

export function assertNoCategoryDeletionWriteLock(database) {
  clearExpiredCategoryOperationLocks(database)

  const activeLock = database
    .prepare(
      "SELECT lock_key FROM category_operation_locks WHERE lock_key = ? AND expires_at > datetime('now')"
    )
    .get(CATEGORY_OPERATION_LOCK_KEY)

  if (activeLock) {
    throw new Error(CATEGORY_DELETE_WRITE_LOCK_MESSAGE)
  }
}

export function withCategoryDeletionWriteLock(
  database,
  { sourceCategoryId, targetCategoryId = null, reason },
  callback
) {
  clearExpiredCategoryOperationLocks(database)

  const token = randomUUID()

  try {
    database
      .prepare(
        `INSERT INTO category_operation_locks
         (lock_key, token, source_category_id, target_category_id, reason, expires_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now', ?), datetime('now'))`
      )
      .run(
        CATEGORY_OPERATION_LOCK_KEY,
        token,
        sourceCategoryId,
        targetCategoryId,
        reason,
        `+${CATEGORY_DELETE_LOCK_TTL_SECONDS} seconds`
      )
  } catch (error) {
    throw new Error(
      error?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY'
        ? CATEGORY_DELETE_LOCK_BUSY_MESSAGE
        : error.message
    )
  }

  try {
    return callback()
  } finally {
    database
      .prepare(
        'DELETE FROM category_operation_locks WHERE lock_key = ? AND token = ?'
      )
      .run(CATEGORY_OPERATION_LOCK_KEY, token)
  }
}

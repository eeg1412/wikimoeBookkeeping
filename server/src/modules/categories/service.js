import { getDb } from '../../db/init.js'
import {
  DEFAULT_CATEGORY_ICON,
  normalizeCategoryIconName
} from '../../constants/icons.js'
import {
  generateCategoryColor,
  normalizeCategoryColor,
  parseCategoryColor
} from '../../../../shared/category-colors.js'

export function listCategories() {
  const db = getDb()
  const rows = db
    .prepare(
      'SELECT * FROM categories WHERE is_deleted = 0 ORDER BY sort_order, id'
    )
    .all()

  const parents = rows.filter(r => !r.parent_id)
  return parents.map(p => ({
    ...p,
    effective_color: p.color,
    children: rows
      .filter(r => r.parent_id === p.id)
      .map(child => ({
        ...child,
        effective_color: p.color || child.color || null
      }))
  }))
}

export function getCategoryFlat() {
  const db = getDb()
  const rows = db
    .prepare(
      'SELECT * FROM categories WHERE is_deleted = 0 ORDER BY sort_order, id'
    )
    .all()

  const parentColorMap = new Map(
    rows.filter(row => !row.parent_id).map(row => [row.id, row.color || null])
  )

  return rows.map(row => ({
    ...row,
    effective_color: row.parent_id
      ? parentColorMap.get(row.parent_id) || row.color || null
      : row.color || null
  }))
}

export function getCategory(id) {
  const db = getDb()
  return getCategoryRow(db, id)
}

export function createCategory({
  name,
  type,
  parent_id,
  icon,
  color,
  sort_order
}) {
  const db = getDb()

  if (parent_id) {
    const parent = db
      .prepare('SELECT * FROM categories WHERE id = ? AND is_deleted = 0')
      .get(parent_id)
    if (!parent) throw new Error('父分类不存在')
    if (parent.parent_id) throw new Error('只支持两级分类')
    if (parent.type !== type) throw new Error('子分类类型必须与父分类一致')
  }

  const nextColor = parent_id ? null : resolveCategoryColor(color)

  const result = db
    .prepare(
      'INSERT INTO categories (name, type, parent_id, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(
      name,
      type,
      parent_id || null,
      normalizeCategoryIconName(icon || DEFAULT_CATEGORY_ICON),
      nextColor,
      sort_order || 0
    )

  return getCategory(Number(result.lastInsertRowid))
}

export function updateCategory(id, { name, icon, color, sort_order }) {
  const db = getDb()
  const cat = getCategory(id)
  if (!cat) throw new Error('分类不存在')

  const nextIcon =
    icon == null
      ? normalizeCategoryIconName(cat.icon)
      : normalizeCategoryIconName(icon)

  const nextColor = cat.parent_id
    ? null
    : resolveCategoryColor(color, cat.color)

  db.prepare(
    "UPDATE categories SET name = ?, icon = ?, color = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(name ?? cat.name, nextIcon, nextColor, sort_order ?? cat.sort_order, id)

  return getCategory(id)
}

export function getDeleteCategoryPlan(id) {
  const db = getDb()
  const category = getCategoryRow(db, id)

  if (!category) {
    throw new Error('分类不存在')
  }

  return buildDeleteCategoryPlan(db, category)
}

export function deleteCategory(id) {
  const db = getDb()
  const category = getCategoryRow(db, id)

  if (!category) {
    throw new Error('分类不存在')
  }

  const plan = buildDeleteCategoryPlan(db, category)

  if (plan.child_category_count > 0) {
    throw new Error('请先处理子分类后再删除')
  }

  if (plan.requires_migration) {
    throw new Error('该分类下仍有关联账目或周期规则，请先迁移后再删除')
  }

  db.prepare(
    "UPDATE categories SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?"
  ).run(id)
}

export function migrateCategoryAndDelete(id, targetCategoryId) {
  const db = getDb()
  const sourceCategory = getCategoryRow(db, id)

  if (!sourceCategory) {
    throw new Error('分类不存在')
  }

  if (!targetCategoryId) {
    throw new Error('目标分类不能为空')
  }

  if (id === targetCategoryId) {
    throw new Error('不能迁移到当前分类')
  }

  const targetCategory = getCategoryRow(db, targetCategoryId)

  if (!targetCategory) {
    throw new Error('目标分类不存在')
  }

  if (sourceCategory.type !== targetCategory.type) {
    throw new Error('只能迁移到同类型分类')
  }

  const plan = buildDeleteCategoryPlan(db, sourceCategory)

  if (plan.child_category_count > 0) {
    throw new Error('请先处理子分类后再删除')
  }

  return runInTransaction(db, () => {
    const migratedTransactions = db
      .prepare(
        "UPDATE transactions SET category_id = ?, updated_at = datetime('now') WHERE category_id = ? AND is_deleted = 0"
      )
      .run(targetCategoryId, id).changes

    const migratedRecurringRules = db
      .prepare(
        "UPDATE recurring_rules SET category_id = ?, updated_at = datetime('now') WHERE category_id = ? AND is_deleted = 0"
      )
      .run(targetCategoryId, id).changes

    db.prepare(
      "UPDATE categories SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?"
    ).run(id)

    return {
      deleted_category_id: id,
      target_category_id: targetCategoryId,
      migrated_transaction_count: migratedTransactions,
      migrated_recurring_rule_count: migratedRecurringRules
    }
  })
}

function resolveCategoryColor(color, fallback = null) {
  if (color == null || String(color).trim() === '') {
    return normalizeCategoryColor(fallback, generateCategoryColor())
  }

  if (!parseCategoryColor(color)) {
    throw new Error('分类颜色无效')
  }

  return normalizeCategoryColor(color, fallback)
}

function getCategoryRow(db, id) {
  return db
    .prepare('SELECT * FROM categories WHERE id = ? AND is_deleted = 0')
    .get(id)
}

function getDeleteCategoryUsage(db, categoryId) {
  const childCategoryCount = db
    .prepare(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = ? AND is_deleted = 0'
    )
    .get(categoryId).count

  const transactionCount = db
    .prepare(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = ? AND is_deleted = 0'
    )
    .get(categoryId).count

  const recurringRuleCount = db
    .prepare(
      'SELECT COUNT(*) as count FROM recurring_rules WHERE category_id = ? AND is_deleted = 0'
    )
    .get(categoryId).count

  return {
    childCategoryCount,
    transactionCount,
    recurringRuleCount
  }
}

function buildDeleteCategoryPlan(db, category) {
  const { childCategoryCount, transactionCount, recurringRuleCount } =
    getDeleteCategoryUsage(db, category.id)
  const requiresMigration =
    childCategoryCount === 0 &&
    (transactionCount > 0 || recurringRuleCount > 0)

  return {
    category,
    child_category_count: childCategoryCount,
    transaction_count: transactionCount,
    recurring_rule_count: recurringRuleCount,
    can_delete_directly:
      childCategoryCount === 0 &&
      transactionCount === 0 &&
      recurringRuleCount === 0,
    requires_migration: requiresMigration
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

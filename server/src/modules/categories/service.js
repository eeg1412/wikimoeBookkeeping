import { getDb } from '../../db/init.js'
import {
  DEFAULT_CATEGORY_ICON,
  normalizeCategoryIconName
} from '../../constants/icons.js'

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
    children: rows.filter(r => r.parent_id === p.id)
  }))
}

export function getCategoryFlat() {
  const db = getDb()
  return db
    .prepare(
      'SELECT * FROM categories WHERE is_deleted = 0 ORDER BY sort_order, id'
    )
    .all()
}

export function getCategory(id) {
  const db = getDb()
  return db
    .prepare('SELECT * FROM categories WHERE id = ? AND is_deleted = 0')
    .get(id)
}

export function createCategory({ name, type, parent_id, icon, sort_order }) {
  const db = getDb()

  if (parent_id) {
    const parent = db
      .prepare('SELECT * FROM categories WHERE id = ? AND is_deleted = 0')
      .get(parent_id)
    if (!parent) throw new Error('父分类不存在')
    if (parent.parent_id) throw new Error('只支持两级分类')
    if (parent.type !== type) throw new Error('子分类类型必须与父分类一致')
  }

  const result = db
    .prepare(
      'INSERT INTO categories (name, type, parent_id, icon, sort_order) VALUES (?, ?, ?, ?, ?)'
    )
    .run(
      name,
      type,
      parent_id || null,
      normalizeCategoryIconName(icon || DEFAULT_CATEGORY_ICON),
      sort_order || 0
    )

  return getCategory(Number(result.lastInsertRowid))
}

export function updateCategory(id, { name, icon, sort_order }) {
  const db = getDb()
  const cat = getCategory(id)
  if (!cat) throw new Error('分类不存在')

  const nextIcon =
    icon == null
      ? normalizeCategoryIconName(cat.icon)
      : normalizeCategoryIconName(icon)

  db.prepare(
    "UPDATE categories SET name = ?, icon = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(name ?? cat.name, nextIcon, sort_order ?? cat.sort_order, id)

  return getCategory(id)
}

export function deleteCategory(id) {
  const db = getDb()
  const cat = getCategory(id)
  if (!cat) throw new Error('分类不存在')

  const children = db
    .prepare(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = ? AND is_deleted = 0'
    )
    .get(id)
  if (children.count > 0) throw new Error('请先删除子分类')

  const txns = db
    .prepare(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = ? AND is_deleted = 0'
    )
    .get(id)
  if (txns.count > 0) throw new Error('该分类下有账目记录，无法删除')

  db.prepare(
    "UPDATE categories SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?"
  ).run(id)
}

export const DEFAULT_CATEGORY_ICON = 'folder'

export const CATEGORY_ICON_NAMES = [
  DEFAULT_CATEGORY_ICON,
  'shopping-cart',
  'food',
  'home',
  'car',
  'bus',
  'flight',
  'games',
  'phone',
  'computer',
  'style',
  'medical',
  'pill',
  'book',
  'education',
  'video',
  'music',
  'sport',
  'cat',
  'dog',
  'family',
  'gift',
  'money',
  'income',
  'payment',
  'bank',
  'wallet',
  'coin',
  'coffee',
  'beer',
  'cake',
  'shopping-bag',
  'tools',
  'call',
  'lightbulb',
  'delete'
]

export const LEGACY_CATEGORY_ICON_MAP = {
  '📁': DEFAULT_CATEGORY_ICON,
  '🍔': 'food',
  '🛒': 'shopping-cart',
  '🏠': 'home',
  '🚗': 'car',
  '🚌': 'bus',
  '✈️': 'flight',
  '🎮': 'games',
  '📱': 'phone',
  '💻': 'computer',
  '👔': 'style',
  '👗': 'style',
  '💄': 'style',
  '🏥': 'medical',
  '💊': 'pill',
  '📚': 'book',
  '🎓': 'education',
  '🎬': 'video',
  '🎵': 'music',
  '⚽': 'sport',
  '🏋️': 'sport',
  '🐱': 'cat',
  '🐶': 'dog',
  '👶': 'family',
  '🎁': 'gift',
  '💰': 'money',
  '📈': 'income',
  '💳': 'payment',
  '🏦': 'bank',
  '💵': 'wallet',
  '🪙': 'coin',
  '☕': 'coffee',
  '🍺': 'beer',
  '🎂': 'cake',
  '🛍️': 'shopping-bag',
  '💇': 'style',
  '🔧': 'tools',
  '📞': 'call',
  '💡': 'lightbulb',
  '🚰': 'lightbulb',
  '🗑️': 'delete'
}

const CATEGORY_ICON_NAME_SET = new Set(CATEGORY_ICON_NAMES)

export function normalizeCategoryIconName(iconName) {
  const value = String(iconName || '').trim()
  if (!value) return DEFAULT_CATEGORY_ICON

  const normalized = LEGACY_CATEGORY_ICON_MAP[value] || value
  if (CATEGORY_ICON_NAME_SET.has(normalized)) {
    return normalized
  }

  return DEFAULT_CATEGORY_ICON
}

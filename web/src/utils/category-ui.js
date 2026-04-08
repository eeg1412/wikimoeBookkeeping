export function normalizeIconGroups(rawIcons) {
  if (!Array.isArray(rawIcons) || rawIcons.length === 0) {
    return []
  }

  if (typeof rawIcons[0] === 'string') {
    return [
      {
        id: 'all',
        label: '全部图标',
        icons: rawIcons.map(icon => ({ name: icon, label: icon }))
      }
    ]
  }

  return rawIcons
}

export function filterIconGroups(groups, type) {
  const filteredGroups = groups.filter(
    group => !Array.isArray(group.types) || group.types.includes(type)
  )

  const preferredIcons = new Map()

  filteredGroups.forEach((group, groupIndex) => {
    const priority =
      Array.isArray(group.types) && group.types.length === 1 ? 2 : 1

    ;(group.icons || []).forEach((icon, iconIndex) => {
      const current = preferredIcons.get(icon.name)
      if (!current || priority > current.priority) {
        preferredIcons.set(icon.name, {
          groupIndex,
          iconIndex,
          priority
        })
      }
    })
  })

  return filteredGroups
    .map((group, groupIndex) => ({
      ...group,
      icons: (group.icons || []).filter((icon, iconIndex) => {
        const preferred = preferredIcons.get(icon.name)
        return (
          preferred?.groupIndex === groupIndex &&
          preferred?.iconIndex === iconIndex
        )
      })
    }))
    .filter(group => group.icons.length > 0)
}

export function findIconLabel(groups, iconName) {
  for (const group of groups || []) {
    for (const icon of group.icons || []) {
      if (icon.name === iconName) {
        return icon.label
      }
    }
  }

  return null
}

export function toAlphaColor(color, alpha) {
  const normalized = String(color || '').trim()
  if (!normalized.startsWith('hsl(') || !normalized.endsWith(')')) {
    return normalized
  }

  return `${normalized.slice(0, -1)} / ${alpha})`
}

export function getCategoryAccentColor(category) {
  return (
    category?.effective_color ||
    category?.category_color ||
    category?.color ||
    null
  )
}

function hasParentCategory(category) {
  return category?.parent_id !== null && category?.parent_id !== undefined
}

function getParentCategoryGroupKey(category) {
  const parentId = hasParentCategory(category)
    ? category.parent_id
    : category.id
  return `parent-${parentId}`
}

function getParentCategoryLabel(category) {
  return category?.parent_name || category?.name || ''
}

function getParentCategoryIcon(category) {
  return hasParentCategory(category)
    ? category?.parent_icon || category?.icon
    : category?.icon
}

function clampPercentage(value) {
  return Math.min(Math.max(Number(value) || 0, 0), 100)
}

export function buildParentCategoryGroups(categories, limit = Infinity) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return []
  }

  const groups = new Map()
  const totalAmount = categories.reduce(
    (sum, category) => sum + (Number(category.total) || 0),
    0
  )

  for (const category of categories) {
    const key = getParentCategoryGroupKey(category)
    const currentGroup = groups.get(key) || {
      key,
      label: getParentCategoryLabel(category),
      icon: getParentCategoryIcon(category),
      color: getCategoryAccentColor(category),
      total: 0,
      count: 0,
      children: [],
      directItem: null
    }
    const total = Number(category.total) || 0
    const count = Number(category.count) || 0
    const color = getCategoryAccentColor(category)

    currentGroup.total += total
    currentGroup.count += count
    currentGroup.icon = currentGroup.icon || getParentCategoryIcon(category)
    currentGroup.color = currentGroup.color || color

    if (hasParentCategory(category)) {
      currentGroup.children.push({
        id: category.id,
        name: category.name,
        icon: category.icon,
        total,
        count,
        color
      })
    } else {
      currentGroup.directItem = {
        id: `direct-${category.id}`,
        name: `${category.name}（父级）`,
        icon: category.icon,
        total,
        count,
        color,
        isDirectParent: true
      }
    }

    groups.set(key, currentGroup)
  }

  return Array.from(groups.values())
    .sort((left, right) => right.total - left.total)
    .slice(0, limit)
    .map(group => {
      const hasDirectEntries = Boolean(
        group.directItem && group.children.length > 0
      )
      const percentageValue =
        totalAmount > 0 ? (group.total / totalAmount) * 100 : 0
      const items = [
        ...group.children,
        ...(hasDirectEntries ? [group.directItem] : [])
      ]
        .sort((left, right) => right.total - left.total)
        .map(item => {
          const itemPercentage =
            group.total > 0 ? (item.total / group.total) * 100 : 0

          return {
            ...item,
            percentageText: itemPercentage.toFixed(1),
            percentageValue: clampPercentage(itemPercentage)
          }
        })

      return {
        key: group.key,
        label: group.label,
        icon: group.icon,
        color: group.color,
        total: group.total,
        count: group.count,
        items,
        childItemCount: group.children.length,
        hasDirectEntries,
        detailsText: group.children.length
          ? `含${group.children.length}个小类${hasDirectEntries ? '及父级记录' : ''}`
          : '',
        percentageText: percentageValue.toFixed(1),
        percentageValue: clampPercentage(percentageValue)
      }
    })
}

export function buildParentCategoryDonutData(categories, limit = Infinity) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return []
  }

  const total = categories.reduce(
    (sum, category) => sum + (Number(category.total) || 0),
    0
  )
  const grouped = new Map()

  for (const category of categories) {
    const key = getParentCategoryGroupKey(category)
    const current = grouped.get(key)

    if (current) {
      current.value += Number(category.total) || 0
      continue
    }

    grouped.set(key, {
      label: getParentCategoryLabel(category),
      value: Number(category.total) || 0,
      color: getCategoryAccentColor(category),
      icon: getParentCategoryIcon(category)
    })
  }

  return Array.from(grouped.values())
    .sort((left, right) => right.value - left.value)
    .slice(0, limit)
    .map(item => ({
      ...item,
      percentage: total > 0 ? +((item.value / total) * 100).toFixed(1) : 0
    }))
}

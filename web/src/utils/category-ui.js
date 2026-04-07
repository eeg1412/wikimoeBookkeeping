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
    const key = category.parent_id
      ? `parent-${category.parent_id}`
      : `self-${category.id}`
    const current = grouped.get(key)

    if (current) {
      current.value += Number(category.total) || 0
      continue
    }

    grouped.set(key, {
      label: category.parent_name || category.name,
      value: Number(category.total) || 0,
      color: getCategoryAccentColor(category),
      icon: category.parent_id
        ? category.parent_icon || category.icon
        : category.icon
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

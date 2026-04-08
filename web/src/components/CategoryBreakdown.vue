<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
    <SimpleChart
      class="shrink-0"
      type="donut"
      :data="donutData"
      :value-formatter="valueFormatter"
      :show-legend="false"
      :center-label="centerLabel"
      :center-value="centerValue"
    />
    <div class="min-w-0 flex-1 space-y-3">
      <div
        v-for="group in categoryGroups"
        :key="group.key"
        class="rounded-xl border border-border/60 bg-surface-secondary/30 p-3"
      >
        <div class="flex items-start gap-3">
          <span
            class="mt-1 h-3 w-3 rounded-full shrink-0"
            :style="{ backgroundColor: group.color }"
          ></span>
          <div class="min-w-0 flex-1">
            <div class="flex items-start gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <AppIcon
                    :name="group.icon || DEFAULT_CATEGORY_ICON"
                    :size="16"
                    class="shrink-0"
                    :style="getCategoryStyle(group)"
                  />
                  <div
                    class="truncate font-semibold"
                    :style="group.color ? { color: group.color } : undefined"
                  >
                    {{ group.label }}
                  </div>
                </div>
                <div class="mt-1 text-xs text-on-surface-secondary">
                  {{ group.count }}笔
                </div>
              </div>
              <div class="shrink-0 text-right">
                <div class="font-semibold text-on-surface">
                  {{ group.percentageText }}%
                </div>
                <div class="text-xs text-on-surface-secondary">
                  {{ formatValue(group.total) }}
                </div>
              </div>
            </div>
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-border/60">
              <div
                class="h-full rounded-full"
                :style="{
                  width: group.percentageValue + '%',
                  backgroundColor: group.color
                }"
              ></div>
            </div>
            <div class="mt-3 flex items-center justify-between gap-3 text-xs">
              <span class="text-on-surface-secondary">
                {{ group.items.length ? `含${group.items.length}个小类` : '' }}
              </span>
              <button
                v-if="group.items.length"
                type="button"
                class="font-medium text-primary"
                @click="toggleGroup(group.key)"
              >
                {{ isGroupExpanded(group.key) ? '收起' : '展开' }}
              </button>
            </div>
            <div
              v-if="group.items.length && isGroupExpanded(group.key)"
              class="mt-3 rounded-lg bg-surface-secondary/60 p-3 space-y-3"
            >
              <div
                v-for="item in group.items"
                :key="item.id"
                class="text-xs sm:text-sm"
              >
                <div class="flex items-start gap-2">
                  <AppIcon
                    :name="item.icon || DEFAULT_CATEGORY_ICON"
                    :size="16"
                    class="mt-0.5 shrink-0"
                    :style="getCategoryStyle(item)"
                  />
                  <div class="min-w-0 flex-1">
                    <div class="flex items-start gap-3">
                      <div class="min-w-0 flex-1">
                        <div class="truncate" :style="getCategoryStyle(item)">
                          {{ item.name }}
                        </div>
                        <div
                          class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-on-surface-secondary"
                        >
                          <span>{{ item.count }}笔</span>
                          <span class="font-medium text-on-surface">{{
                            formatValue(item.total)
                          }}</span>
                        </div>
                      </div>
                      <div class="shrink-0 text-right">
                        <div class="font-medium text-on-surface">
                          {{ item.percentageText }}%
                        </div>
                      </div>
                    </div>
                    <div
                      class="mt-1.5 h-1 overflow-hidden rounded-full bg-border/50"
                    >
                      <div
                        class="h-full rounded-full"
                        :style="{
                          width: item.percentageValue + '%',
                          backgroundColor: item.color || group.color
                        }"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { DEFAULT_CATEGORY_ICON } from '@shared/icon-names.js'
import SimpleChart from './SimpleChart.vue'
import AppIcon from './AppIcon.vue'
import {
  buildParentCategoryDonutData,
  getCategoryAccentColor
} from '../utils/category-ui.js'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  centerLabel: { type: String, default: '' },
  valueFormatter: Function
})

const groupLimit = 10
const expandedGroups = ref({})

const centerValue = computed(() => formatValue(props.total))

const donutData = computed(() =>
  buildParentCategoryDonutData(props.categories, groupLimit)
)

const categoryGroups = computed(() => buildCategoryGroups(props.categories))

watch(
  categoryGroups,
  groups => {
    expandedGroups.value = Object.fromEntries(
      groups.map(group => [group.key, expandedGroups.value[group.key] ?? false])
    )
  },
  { immediate: true }
)

function formatValue(value) {
  const numericValue = Number(value) || 0

  if (typeof props.valueFormatter === 'function') {
    return props.valueFormatter(numericValue)
  }

  return numericValue.toLocaleString('zh-CN', {
    minimumFractionDigits: Number.isInteger(numericValue) ? 0 : 2,
    maximumFractionDigits: 2
  })
}

function getCategoryStyle(category) {
  const color = getCategoryAccentColor(category)
  return color ? { color } : undefined
}

function toggleGroup(key) {
  expandedGroups.value = {
    ...expandedGroups.value,
    [key]: !expandedGroups.value[key]
  }
}

function isGroupExpanded(key) {
  return Boolean(expandedGroups.value[key])
}

function buildCategoryGroups(categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return []
  }

  const groups = new Map()
  const totalAmount = categories.reduce(
    (sum, category) => sum + (Number(category.total) || 0),
    0
  )

  categories.forEach(category => {
    const key = category.parent_id
      ? `parent-${category.parent_id}`
      : `self-${category.id}`
    const currentGroup = groups.get(key) || {
      key,
      label: category.parent_name || category.name,
      icon: category.parent_id
        ? category.parent_icon || category.icon
        : category.icon,
      color: getCategoryAccentColor(category),
      total: 0,
      count: 0,
      items: []
    }

    currentGroup.total += Number(category.total) || 0
    currentGroup.count += Number(category.count) || 0
    currentGroup.icon =
      currentGroup.icon ||
      (category.parent_id
        ? category.parent_icon || category.icon
        : category.icon)
    currentGroup.color = currentGroup.color || getCategoryAccentColor(category)

    if (category.parent_id) {
      currentGroup.items.push({
        id: category.id,
        name: category.name,
        icon: category.icon,
        total: Number(category.total) || 0,
        count: Number(category.count) || 0,
        color: getCategoryAccentColor(category)
      })
    }

    groups.set(key, currentGroup)
  })

  return Array.from(groups.values())
    .sort((left, right) => right.total - left.total)
    .slice(0, groupLimit)
    .map(group => {
      const percentageValue =
        totalAmount > 0 ? (group.total / totalAmount) * 100 : 0
      const items = group.items
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
        ...group,
        percentageText: percentageValue.toFixed(1),
        percentageValue: clampPercentage(percentageValue),
        items
      }
    })
}

function clampPercentage(value) {
  return Math.min(Math.max(Number(value) || 0, 0), 100)
}
</script>

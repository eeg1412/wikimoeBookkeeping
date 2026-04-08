<template>
  <div class="space-y-4">
    <h1 class="page-title">统计报表</h1>

    <div class="card">
      <div class="flex flex-wrap gap-2 items-stretch sm:items-center">
        <div class="flex w-full flex-wrap gap-1 sm:w-auto">
          <button
            v-for="p in periods"
            :key="p.value"
            class="btn-sm"
            :class="period === p.value ? 'btn-primary' : 'btn-secondary'"
            @click="selectPeriod(p.value)"
          >
            {{ p.label }}
          </button>
        </div>
        <PeriodPicker
          v-model="dateStr"
          :period="period"
          :week-start="Number(settingsStore.settings.week_start) || 1"
          class="w-full sm:w-auto"
          @update:model-value="loadData"
        />
        <select
          v-model="selectedCurrency"
          class="select text-sm w-full sm:w-36"
          :disabled="!filterCurrencies.length"
          @change="loadData"
        >
          <option v-if="!filterCurrencies.length" value="">暂无币种</option>
          <option
            v-for="currency in filterCurrencies"
            :key="currency.code"
            :value="currency.code"
          >
            {{ currency.symbol }} {{ currency.code }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="summary" class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard
        title="收入"
        :value="summary.income"
        type="income"
        :prefix="currencySymbol"
      />
      <StatCard
        title="支出"
        :value="summary.expense"
        type="expense"
        :prefix="currencySymbol"
      />
      <StatCard
        title="结余"
        :value="summary.net"
        type="balance"
        :prefix="currencySymbol"
      />
    </div>

    <div
      v-if="expenseCategoryReport || incomeCategoryReport"
      class="grid grid-cols-1 gap-3 xl:grid-cols-2"
    >
      <div class="card">
        <div class="flex items-center justify-between gap-3 mb-3">
          <h2 class="font-bold text-rose-500">支出分类</h2>
          <span class="text-xs text-on-surface-secondary">按分类占比</span>
        </div>

        <template v-if="expenseCategoryReport?.categories?.length">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
            <SimpleChart
              class="shrink-0"
              type="donut"
              :data="expenseDonutData"
              :value-formatter="formatChartValue"
              :show-legend="false"
              center-label="总支出"
              :center-value="
                settingsStore.formatMoney(
                  expenseCategoryReport.total,
                  selectedCurrency
                )
              "
            />
            <div class="min-w-0 flex-1 space-y-3">
              <div
                v-for="group in expenseCategoryGroups"
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
                            :style="
                              group.color ? { color: group.color } : undefined
                            "
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
                          {{ formatChartValue(group.total) }}
                        </div>
                      </div>
                    </div>
                    <div
                      class="mt-2 h-1.5 overflow-hidden rounded-full bg-border/60"
                    >
                      <div
                        class="h-full rounded-full"
                        :style="{
                          width: group.percentageValue + '%',
                          backgroundColor: group.color
                        }"
                      ></div>
                    </div>
                    <div
                      class="mt-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <span class="text-on-surface-secondary">
                        {{
                          group.items.length
                            ? `含${group.items.length}个小类`
                            : '无小类'
                        }}
                      </span>
                      <button
                        v-if="group.items.length"
                        type="button"
                        class="font-medium text-primary"
                        @click="toggleCategoryGroup('expense', group.key)"
                      >
                        {{
                          isCategoryGroupExpanded('expense', group.key)
                            ? '收起'
                            : '展开'
                        }}
                      </button>
                    </div>
                    <div
                      v-if="
                        group.items.length &&
                        isCategoryGroupExpanded('expense', group.key)
                      "
                      class="mt-3 rounded-lg bg-surface-secondary/60 p-3 space-y-3"
                    >
                      <div
                        v-for="item in group.items"
                        :key="item.id"
                        class="text-xs sm:text-sm"
                      >
                        <div class="flex items-start gap-2">
                          <AppIcon
                            :name="item.icon"
                            :size="16"
                            class="mt-0.5 shrink-0"
                            :style="getCategoryStyle(item)"
                          />
                          <div class="min-w-0 flex-1">
                            <div class="flex items-start gap-3">
                              <div class="min-w-0 flex-1">
                                <div
                                  class="truncate"
                                  :style="getCategoryStyle(item)"
                                >
                                  {{ item.name }}
                                </div>
                                <div
                                  class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-on-surface-secondary"
                                >
                                  <span>{{ item.count }}笔</span>
                                  <span class="font-medium text-on-surface">{{
                                    formatChartValue(item.total)
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
        <p v-else class="text-sm text-on-surface-secondary">
          当前币种下暂无支出分类数据。
        </p>
      </div>

      <div class="card">
        <div class="flex items-center justify-between gap-3 mb-3">
          <h2 class="font-bold text-emerald-500">收入分类</h2>
          <span class="text-xs text-on-surface-secondary">按分类占比</span>
        </div>

        <template v-if="incomeCategoryReport?.categories?.length">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
            <SimpleChart
              class="shrink-0"
              type="donut"
              :data="incomeDonutData"
              :value-formatter="formatChartValue"
              :show-legend="false"
              center-label="总收入"
              :center-value="
                settingsStore.formatMoney(
                  incomeCategoryReport.total,
                  selectedCurrency
                )
              "
            />
            <div class="min-w-0 flex-1 space-y-3">
              <div
                v-for="group in incomeCategoryGroups"
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
                            :style="
                              group.color ? { color: group.color } : undefined
                            "
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
                          {{ formatChartValue(group.total) }}
                        </div>
                      </div>
                    </div>
                    <div
                      class="mt-2 h-1.5 overflow-hidden rounded-full bg-border/60"
                    >
                      <div
                        class="h-full rounded-full"
                        :style="{
                          width: group.percentageValue + '%',
                          backgroundColor: group.color
                        }"
                      ></div>
                    </div>
                    <div
                      class="mt-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <span class="text-on-surface-secondary">
                        {{
                          group.items.length
                            ? `含${group.items.length}个小类`
                            : '无小类'
                        }}
                      </span>
                      <button
                        v-if="group.items.length"
                        type="button"
                        class="font-medium text-primary"
                        @click="toggleCategoryGroup('income', group.key)"
                      >
                        {{
                          isCategoryGroupExpanded('income', group.key)
                            ? '收起'
                            : '展开'
                        }}
                      </button>
                    </div>
                    <div
                      v-if="
                        group.items.length &&
                        isCategoryGroupExpanded('income', group.key)
                      "
                      class="mt-3 rounded-lg bg-surface-secondary/60 p-3 space-y-3"
                    >
                      <div
                        v-for="item in group.items"
                        :key="item.id"
                        class="text-xs sm:text-sm"
                      >
                        <div class="flex items-start gap-2">
                          <AppIcon
                            :name="item.icon"
                            :size="16"
                            class="mt-0.5 shrink-0"
                            :style="getCategoryStyle(item)"
                          />
                          <div class="min-w-0 flex-1">
                            <div class="flex items-start gap-3">
                              <div class="min-w-0 flex-1">
                                <div
                                  class="truncate"
                                  :style="getCategoryStyle(item)"
                                >
                                  {{ item.name }}
                                </div>
                                <div
                                  class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-on-surface-secondary"
                                >
                                  <span>{{ item.count }}笔</span>
                                  <span class="font-medium text-on-surface">{{
                                    formatChartValue(item.total)
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
        <p v-else class="text-sm text-on-surface-secondary">
          当前币种下暂无收入分类数据。
        </p>
      </div>
    </div>

    <div v-if="trendData.length" class="space-y-3">
      <!-- <h2 class="font-bold">趋势</h2> -->
      <p class="mb-2 text-xs text-on-surface-secondary sm:hidden">
        左右滑动可查看完整趋势。
      </p>
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div class="card">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h3 class="font-bold text-rose-500">支出趋势</h3>
            <span class="text-xs text-on-surface-secondary">{{
              trendGranularityLabel
            }}</span>
          </div>
          <SimpleChart
            type="bar"
            :data="expenseBarData"
            :height="trendChartHeight"
            :value-formatter="formatChartValue"
          />
          <!-- <div class="mt-1 flex justify-center text-xs">
            <span class="flex items-center gap-1">
              <span class="h-3 w-3 rounded-sm bg-rose-500"></span>
              支出
            </span>
          </div> -->
        </div>
        <div class="card">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h3 class="font-bold text-emerald-500">收入趋势</h3>
            <span class="text-xs text-on-surface-secondary">{{
              trendGranularityLabel
            }}</span>
          </div>
          <SimpleChart
            type="bar"
            :data="incomeBarData"
            :height="trendChartHeight"
            :value-formatter="formatChartValue"
          />
          <!-- <div class="mt-1 flex justify-center text-xs">
            <span class="flex items-center gap-1">
              <span class="h-3 w-3 rounded-sm bg-emerald-500"></span>
              收入
            </span>
          </div> -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { DEFAULT_CATEGORY_ICON } from '@shared/icon-names.js'
import { useReportsStore } from '../stores/reports.js'
import { useSettingsStore } from '../stores/settings.js'
import StatCard from '../components/StatCard.vue'
import SimpleChart from '../components/SimpleChart.vue'
import AppIcon from '../components/AppIcon.vue'
import PeriodPicker from '../components/PeriodPicker.vue'
import {
  buildParentCategoryDonutData,
  getCategoryAccentColor
} from '../utils/category-ui.js'

const reportsStore = useReportsStore()
const settingsStore = useSettingsStore()

const period = ref('month')
const dateStr = ref(new Date().toISOString().split('T')[0])
const selectedCurrency = ref('')
const hasInitializedSelectedCurrency = ref(false)
const isCompactViewport = ref(false)
const expenseExpandedGroups = ref({})
const incomeExpandedGroups = ref({})

const summary = ref(null)
const expenseCategoryReport = ref(null)
const incomeCategoryReport = ref(null)
const trendData = ref([])

const categoryGroupLimit = 10

const periods = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' }
]

const filterCurrencies = computed(() => settingsStore.getFilterCurrencies())
const currencySymbol = computed(() =>
  settingsStore.getCurrencySymbol(
    selectedCurrency.value || settingsStore.settings.default_currency
  )
)

const expenseDonutData = computed(() =>
  buildParentCategoryDonutData(
    expenseCategoryReport.value?.categories || [],
    categoryGroupLimit
  )
)

const incomeDonutData = computed(() =>
  buildParentCategoryDonutData(
    incomeCategoryReport.value?.categories || [],
    categoryGroupLimit
  )
)

const expenseCategoryGroups = computed(() =>
  buildCategoryGroups(expenseCategoryReport.value?.categories || [])
)

const incomeCategoryGroups = computed(() =>
  buildCategoryGroups(incomeCategoryReport.value?.categories || [])
)

const incomeBarData = computed(() =>
  trendData.value.map(t => ({
    label: t.label,
    value: t.income || 0,
    color: '#10b981'
  }))
)

const expenseBarData = computed(() =>
  trendData.value.map(t => ({
    label: t.label,
    value: t.expense || 0,
    color: '#f43f5e'
  }))
)

const trendGranularityLabel = computed(() =>
  period.value === 'year' ? '按月汇总' : '按日汇总'
)

const trendChartHeight = computed(() => (isCompactViewport.value ? 128 : 152))

let compactViewportMediaQuery = null

function handleCompactViewportChange(event) {
  isCompactViewport.value = event.matches
}

function selectPeriod(nextPeriod) {
  period.value = nextPeriod
  loadData()
}

function getCategoryStyle(category) {
  const color = getCategoryAccentColor(category)
  return color ? { color } : undefined
}

function formatChartValue(value) {
  return settingsStore.formatMoney(
    value,
    selectedCurrency.value || settingsStore.settings.default_currency
  )
}

function toggleCategoryGroup(type, key) {
  const target =
    type === 'expense' ? expenseExpandedGroups : incomeExpandedGroups

  target.value = {
    ...target.value,
    [key]: !target.value[key]
  }
}

function isCategoryGroupExpanded(type, key) {
  const target =
    type === 'expense' ? expenseExpandedGroups : incomeExpandedGroups
  return Boolean(target.value[key])
}

function syncExpandedGroupState(currentState, groups) {
  return Object.fromEntries(
    groups.map(group => [group.key, currentState[group.key] ?? false])
  )
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
      const itemPercentage = Number(
        category.percentage ??
          (totalAmount > 0
            ? ((Number(category.total) || 0) / totalAmount) * 100
            : 0)
      )

      currentGroup.items.push({
        id: category.id,
        name: category.name,
        icon: category.icon,
        total: Number(category.total) || 0,
        count: Number(category.count) || 0,
        color: getCategoryAccentColor(category),
        percentageText: itemPercentage.toFixed(1),
        percentageValue: clampPercentage(itemPercentage)
      })
    }

    groups.set(key, currentGroup)
  })

  return Array.from(groups.values())
    .sort((left, right) => right.total - left.total)
    .slice(0, categoryGroupLimit)
    .map(group => {
      const percentageValue =
        totalAmount > 0 ? (group.total / totalAmount) * 100 : 0

      return {
        ...group,
        percentageText: percentageValue.toFixed(1),
        percentageValue: clampPercentage(percentageValue),
        items: group.items.sort((left, right) => right.total - left.total)
      }
    })
}

function clampPercentage(value) {
  return Math.min(Math.max(Number(value) || 0, 0), 100)
}

watch(
  expenseCategoryGroups,
  groups => {
    expenseExpandedGroups.value = syncExpandedGroupState(
      expenseExpandedGroups.value,
      groups
    )
  },
  { immediate: true }
)

watch(
  incomeCategoryGroups,
  groups => {
    incomeExpandedGroups.value = syncExpandedGroupState(
      incomeExpandedGroups.value,
      groups
    )
  },
  { immediate: true }
)

async function loadData() {
  summary.value = null
  expenseCategoryReport.value = null
  incomeCategoryReport.value = null
  trendData.value = []

  const params = {
    period: period.value,
    date: dateStr.value,
    currency: selectedCurrency.value || undefined
  }

  summary.value = await reportsStore
    .fetchSummary(params)
    .then(() => reportsStore.summary)
  await Promise.all([loadCategories(), loadTrend()])
}

async function loadCategories() {
  const baseParams = {
    period: period.value,
    date: dateStr.value,
    currency: selectedCurrency.value || undefined
  }

  const [expenseData, incomeData] = await Promise.all([
    reportsStore.fetchCategoryReport({ ...baseParams, type: 'expense' }),
    reportsStore.fetchCategoryReport({ ...baseParams, type: 'income' })
  ])

  expenseCategoryReport.value = expenseData
  incomeCategoryReport.value = incomeData
}

async function loadTrend() {
  const { start, end } = getDateRange()
  await reportsStore.fetchTrend({
    period: period.value === 'year' ? 'month' : 'day',
    start_date: start,
    end_date: end,
    currency: selectedCurrency.value || undefined
  })
  trendData.value = reportsStore.trend
}

function getDateRange() {
  const d = new Date(dateStr.value)
  const y = d.getFullYear()
  const m = d.getMonth()
  switch (period.value) {
    case 'day':
      return { start: dateStr.value, end: dateStr.value }
    case 'week': {
      const ws = Number(settingsStore.settings.week_start) || 1
      const s = new Date(d)
      s.setDate(s.getDate() - ((s.getDay() - ws + 7) % 7))
      const e = new Date(s)
      e.setDate(e.getDate() + 6)
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
      return { start: dateStr.value, end: dateStr.value }
  }
}

function fmt(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

watch(
  [filterCurrencies, () => settingsStore.settings.default_currency],
  ([list]) => {
    if (!list.length) {
      selectedCurrency.value = ''
      loadData()
      return
    }

    const nextCurrency = settingsStore.getPreferredFilterCurrencyCode(list)

    if (!hasInitializedSelectedCurrency.value) {
      selectedCurrency.value = nextCurrency
      hasInitializedSelectedCurrency.value = true
    } else if (
      !selectedCurrency.value ||
      !list.some(item => item.code === selectedCurrency.value)
    ) {
      selectedCurrency.value = nextCurrency
    }

    loadData()
  },
  { immediate: true, flush: 'post' }
)

onMounted(() => {
  compactViewportMediaQuery = window.matchMedia('(max-width: 639px)')
  isCompactViewport.value = compactViewportMediaQuery.matches
  compactViewportMediaQuery.addEventListener(
    'change',
    handleCompactViewportChange
  )
})

onBeforeUnmount(() => {
  compactViewportMediaQuery?.removeEventListener(
    'change',
    handleCompactViewportChange
  )
})
</script>

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
          <SimpleChart
            type="donut"
            :data="expenseDonutData"
            center-label="总支出"
            :center-value="
              settingsStore.formatMoney(
                expenseCategoryReport.total,
                selectedCurrency
              )
            "
          />
          <div class="mt-4 space-y-2">
            <div
              v-for="cat in expenseCategoryReport.categories"
              :key="cat.id"
              class="flex items-start gap-3 text-sm"
            >
              <AppIcon
                :name="cat.icon"
                :size="20"
                class="mt-0.5 shrink-0"
                :style="getCategoryStyle(cat)"
              />
              <div class="min-w-0 flex-1">
                <div
                  class="truncate font-medium"
                  :style="getCategoryStyle(cat)"
                >
                  {{ cat.parent_name ? cat.parent_name + ' / ' : ''
                  }}{{ cat.name }}
                </div>
                <div
                  class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm"
                >
                  <span class="text-on-surface-secondary"
                    >{{ cat.count }}笔</span
                  >
                  <span class="font-medium">{{ cat.percentage }}%</span>
                  <span class="font-bold">{{
                    settingsStore.formatMoney(cat.total, selectedCurrency)
                  }}</span>
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
          <SimpleChart
            type="donut"
            :data="incomeDonutData"
            center-label="总收入"
            :center-value="
              settingsStore.formatMoney(
                incomeCategoryReport.total,
                selectedCurrency
              )
            "
          />
          <div class="mt-4 space-y-2">
            <div
              v-for="cat in incomeCategoryReport.categories"
              :key="cat.id"
              class="flex items-start gap-3 text-sm"
            >
              <AppIcon
                :name="cat.icon"
                :size="20"
                class="mt-0.5 shrink-0"
                :style="getCategoryStyle(cat)"
              />
              <div class="min-w-0 flex-1">
                <div
                  class="truncate font-medium"
                  :style="getCategoryStyle(cat)"
                >
                  {{ cat.parent_name ? cat.parent_name + ' / ' : ''
                  }}{{ cat.name }}
                </div>
                <div
                  class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm"
                >
                  <span class="text-on-surface-secondary"
                    >{{ cat.count }}笔</span
                  >
                  <span class="font-medium">{{ cat.percentage }}%</span>
                  <span class="font-bold">{{
                    settingsStore.formatMoney(cat.total, selectedCurrency)
                  }}</span>
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

    <div class="card" v-if="trendData.length">
      <h2 class="font-bold mb-3">趋势</h2>
      <p class="mb-2 text-xs text-on-surface-secondary sm:hidden">
        左右滑动可查看完整趋势。
      </p>
      <SimpleChart type="bar" :data="barData" :height="trendChartHeight" />
      <div class="mt-3 flex flex-wrap justify-center gap-4 text-xs">
        <span class="flex items-center gap-1">
          <span class="w-3 h-3 rounded-sm bg-emerald-500"></span> 收入
        </span>
        <span class="flex items-center gap-1">
          <span class="w-3 h-3 rounded-sm bg-rose-500"></span> 支出
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
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

const summary = ref(null)
const expenseCategoryReport = ref(null)
const incomeCategoryReport = ref(null)
const trendData = ref([])

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
    10
  )
)

const incomeDonutData = computed(() =>
  buildParentCategoryDonutData(incomeCategoryReport.value?.categories || [], 10)
)

const barData = computed(() =>
  trendData.value.map(t => ({
    label: t.label,
    series: [
      { label: '收入', value: t.income || 0, color: '#10b981' },
      { label: '支出', value: t.expense || 0, color: '#f43f5e' }
    ]
  }))
)

const trendChartHeight = computed(() => (isCompactViewport.value ? 150 : 180))

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

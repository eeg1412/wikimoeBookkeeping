<template>
  <div class="space-y-4">
    <h1 class="page-title">统计报表</h1>

    <!-- Period selector -->
    <div class="card">
      <div class="flex flex-wrap gap-2 items-center">
        <div class="flex gap-1">
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
        <input
          v-model="dateStr"
          type="date"
          class="input text-sm w-36"
          @change="loadData"
        />
        <select
          v-model="currencyMode"
          class="select text-sm w-32"
          @change="loadData"
        >
          <option value="default">默认币种</option>
          <option value="original">原始币种</option>
        </select>
      </div>
    </div>

    <!-- Summary -->
    <div v-if="summary" class="grid grid-cols-3 gap-3">
      <template v-if="currencyMode === 'original'">
        <div class="card">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm text-on-surface-secondary">收入</span>
            <span class="text-lg">📈</span>
          </div>
          <div v-if="summary.income?.length" class="space-y-0.5">
            <div
              v-for="item in summary.income"
              :key="item.currency"
              class="text-lg font-bold text-emerald-500"
            >
              {{ settingsStore.formatMoney(item.total, item.currency) }}
            </div>
          </div>
          <div v-else class="text-2xl font-bold text-emerald-500">0.00</div>
        </div>
        <div class="card">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm text-on-surface-secondary">支出</span>
            <span class="text-lg">📉</span>
          </div>
          <div v-if="summary.expense?.length" class="space-y-0.5">
            <div
              v-for="item in summary.expense"
              :key="item.currency"
              class="text-lg font-bold text-rose-500"
            >
              {{ settingsStore.formatMoney(item.total, item.currency) }}
            </div>
          </div>
          <div v-else class="text-2xl font-bold text-rose-500">0.00</div>
        </div>
        <div class="card">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm text-on-surface-secondary">结余</span>
          </div>
          <div class="text-sm text-on-surface-secondary">
            原始币种模式下无法计算结余
          </div>
        </div>
      </template>
      <template v-else>
        <StatCard
          title="收入"
          :value="summary.income"
          type="income"
          :prefix="csym"
        />
        <StatCard
          title="支出"
          :value="summary.expense"
          type="expense"
          :prefix="csym"
        />
        <StatCard title="结余" :value="summary.net" :prefix="csym" />
      </template>
    </div>

    <!-- Category chart -->
    <div class="card" v-if="categoryReport?.categories?.length">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-bold">
          <button
            class="mr-2"
            :class="
              catType === 'expense'
                ? 'text-rose-500'
                : 'text-on-surface-secondary'
            "
            @click="selectCatType('expense')"
          >
            支出
          </button>
          <button
            :class="
              catType === 'income'
                ? 'text-emerald-500'
                : 'text-on-surface-secondary'
            "
            @click="selectCatType('income')"
          >
            收入
          </button>
        </h2>
      </div>
      <SimpleChart
        type="donut"
        :data="donutData"
        center-label="总计"
        :center-value="
          currencyMode === 'original'
            ? ''
            : settingsStore.formatMoney(categoryReport.total)
        "
      />
      <!-- Category list -->
      <div class="mt-4 space-y-2">
        <div
          v-for="cat in categoryReport.categories"
          :key="cat.id"
          class="flex items-center gap-2 text-sm"
        >
          <span class="text-lg">{{ cat.icon }}</span>
          <span class="flex-1 truncate"
            >{{ cat.parent_name ? cat.parent_name + ' / ' : ''
            }}{{ cat.name }}</span
          >
          <span class="text-on-surface-secondary">{{ cat.count }}笔</span>
          <span class="font-medium w-20 text-right">{{ cat.percentage }}%</span>
          <span class="font-bold w-24 text-right">{{
            settingsStore.formatMoney(cat.total, cat.currency)
          }}</span>
        </div>
      </div>
    </div>

    <!-- Trend chart -->
    <div class="card" v-if="currencyMode === 'original'">
      <h2 class="font-bold mb-3">趋势</h2>
      <p class="text-sm text-on-surface-secondary">
        原始币种模式下无法直接汇总不同币种，请切换到“默认币种”查看折算后的趋势图。
      </p>
    </div>

    <div class="card" v-else-if="trendData.length">
      <h2 class="font-bold mb-3">趋势</h2>
      <SimpleChart type="bar" :data="barData" :height="180" />
      <div class="flex justify-center gap-6 mt-3 text-xs">
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
import { ref, computed, onMounted } from 'vue'
import { useReportsStore } from '../stores/reports.js'
import { useSettingsStore } from '../stores/settings.js'
import StatCard from '../components/StatCard.vue'
import SimpleChart from '../components/SimpleChart.vue'

const reportsStore = useReportsStore()
const settingsStore = useSettingsStore()

const period = ref('month')
const dateStr = ref(new Date().toISOString().split('T')[0])
const currencyMode = ref('default')
const catType = ref('expense')

const summary = ref(null)
const categoryReport = ref(null)
const trendData = ref([])

const periods = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' }
]

const csym = computed(() =>
  settingsStore.getCurrencySymbol(settingsStore.settings.default_currency)
)

const donutData = computed(() =>
  (categoryReport.value?.categories || []).slice(0, 10).map(c => ({
    label: c.name,
    value: c.total,
    percentage: c.percentage
  }))
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

function selectPeriod(p) {
  period.value = p
  loadData()
}

function selectCatType(type) {
  catType.value = type
  loadCategory()
}

async function loadData() {
  const params = {
    period: period.value,
    date: dateStr.value,
    currency_mode: currencyMode.value
  }
  summary.value = await reportsStore
    .fetchSummary(params)
    .then(() => reportsStore.summary)
  await loadCategory()
  await loadTrend()
}

async function loadCategory() {
  await reportsStore.fetchCategoryReport({
    period: period.value,
    date: dateStr.value,
    type: catType.value,
    currency_mode: currencyMode.value
  })
  categoryReport.value = reportsStore.categoryReport
}

async function loadTrend() {
  const { start, end } = getDateRange()
  await reportsStore.fetchTrend({
    period: period.value === 'year' ? 'month' : 'day',
    start_date: start,
    end_date: end,
    currency_mode: currencyMode.value
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
      const s = new Date(d)
      s.setDate(s.getDate() - s.getDay() + 1)
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
  }
}

function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

onMounted(loadData)
</script>

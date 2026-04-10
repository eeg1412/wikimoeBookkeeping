<template>
  <div class="space-y-4">
    <h1 class="page-title">总览</h1>

    <div class="card">
      <div
        class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2"
      >
        <div
          class="grid w-full grid-cols-5 gap-1 sm:flex sm:w-auto sm:flex-wrap"
        >
          <button
            v-for="p in periods"
            :key="p.value"
            class="btn-sm w-full sm:w-auto"
            :class="period === p.value ? 'btn-primary' : 'btn-secondary'"
            @click="selectPeriod(p.value)"
          >
            {{ p.label }}
          </button>
        </div>

        <template v-if="period === 'custom'">
          <DatePicker
            v-model="customStartDate"
            :week-start="Number(settingsStore.settings.week_start) || 1"
            placeholder="开始日期"
            input-class="min-w-0 w-full text-sm sm:w-36"
            @change="handleCustomRangeChange('start', $event)"
          />
          <span
            class="hidden self-center text-on-surface-secondary sm:inline-flex"
            >至</span
          >
          <DatePicker
            v-model="customEndDate"
            :week-start="Number(settingsStore.settings.week_start) || 1"
            align-right
            placeholder="结束日期"
            input-class="min-w-0 w-full text-sm sm:w-36"
            @change="handleCustomRangeChange('end', $event)"
          />
        </template>
        <PeriodPicker
          v-else
          v-model="dateStr"
          :period="period"
          :week-start="Number(settingsStore.settings.week_start) || 1"
          mobile-full-width
          class="w-full sm:w-auto"
          @update:model-value="loadData"
        />
        <select
          v-model="selectedCurrency"
          class="select min-w-0 w-full text-sm sm:w-32"
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

    <div v-if="summary" class="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatCard
        title="收入"
        :value="summary.income"
        type="income"
        :prefix="currencySymbol"
        icon="income"
      />
      <StatCard
        title="支出"
        :value="summary.expense"
        type="expense"
        :prefix="currencySymbol"
        icon="expense"
      />
      <StatCard
        title="结余"
        :value="summary.net"
        type="balance"
        :prefix="currencySymbol"
        icon="balance"
      />
      <StatCard
        title="笔数"
        :value="`收${summary.income_count || 0} / 支${summary.expense_count || 0}`"
        compact
        icon="notes"
      />
    </div>

    <!-- <div class="card">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="font-bold text-on-surface">最近账目</h2>
        <router-link
          to="/transactions"
          class="inline-flex items-center gap-1 text-sm text-primary"
        >
          <span class="-mr-[7px]">全部</span>
          <AppIcon name="chevron-right" :size="16" />
        </router-link>
      </div>
      <div
        v-if="!recentTxns.length"
        class="py-8 text-center text-on-surface-secondary"
      >
        暂无记录，<router-link to="/transactions/new" class="text-primary"
          >去记一笔</router-link
        >
      </div>
      <div v-else class="divide-y divide-border">
        <div
          v-for="txn in recentTxns"
          :key="txn.id"
          class="flex items-center gap-3 py-3"
        >
          <AppIcon
            :name="txn.category_icon || DEFAULT_CATEGORY_ICON"
            :size="24"
            :style="getTransactionCategoryStyle(txn)"
          />
          <div class="min-w-0 flex-1">
            <div
              class="truncate text-sm font-medium"
              :style="getTransactionCategoryStyle(txn)"
            >
              {{
                txn.parent_category_name
                  ? txn.parent_category_name + ' / '
                  : ''
              }}{{ txn.category_name }}
            </div>
            <div class="text-xs text-on-surface-secondary">
              {{ txn.date }}{{ txn.note ? ' · ' + txn.note : '' }}
            </div>
          </div>
          <div
            class="text-sm font-bold"
            :class="
              txn.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
            "
          >
            {{ txn.type === 'income' ? '+' : '-'
            }}{{ settingsStore.formatMoney(txn.amount, txn.currency) }}
          </div>
        </div>
      </div>
    </div> -->

    <div
      v-if="expenseCategoryReport || incomeCategoryReport"
      class="grid grid-cols-1 gap-3"
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
                        {{ group.detailsText }}
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
                        {{ group.detailsText }}
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

    <router-link
      to="/transactions/new"
      class="fixed bottom-8 right-8 z-10 hidden h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl text-white shadow-lg transition-colors hover:bg-primary-dark min-[1420px]:flex"
    >
      <AppIcon name="add" :size="28" />
    </router-link>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, toRefs } from 'vue'
import { DEFAULT_CATEGORY_ICON } from '@shared/icon-names.js'
import { useReportsStore } from '../stores/reports.js'
import { useSettingsStore } from '../stores/settings.js'
import { api } from '../api/client.js'
import StatCard from '../components/StatCard.vue'
import SimpleChart from '../components/SimpleChart.vue'
import AppIcon from '../components/AppIcon.vue'
import PeriodPicker from '../components/PeriodPicker.vue'
import DatePicker from '../components/DatePicker.vue'
import { getLocalToday } from '../utils/date.js'
import {
  buildParentCategoryGroups,
  buildParentCategoryDonutData,
  getCategoryAccentColor
} from '../utils/category-ui.js'
import { useCachedViewState } from '../composables/useCachedViewState.js'

const REPORTS_VIEW_STATE_KEY = 'reports:overview'

const reportsStore = useReportsStore()
const settingsStore = useSettingsStore()

const today = getLocalToday()
const { state: reportViewState } = useCachedViewState(REPORTS_VIEW_STATE_KEY, {
  period: 'month',
  dateStr: today,
  selectedCurrency: '',
  customStartDate: getMonthStart(today),
  customEndDate: today,
  expenseExpandedGroups: {},
  incomeExpandedGroups: {}
})
const {
  period,
  dateStr,
  selectedCurrency,
  customStartDate,
  customEndDate,
  expenseExpandedGroups,
  incomeExpandedGroups
} = toRefs(reportViewState)

const isCompactViewport = ref(false)

const summary = ref(null)
const expenseCategoryReport = ref(null)
const incomeCategoryReport = ref(null)
const trendData = ref([])
const recentTxns = ref([])

const categoryGroupLimit = 10

const periods = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
  { value: 'custom', label: '自由' }
]

const isCustomRange = computed(() => period.value === 'custom')
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
  buildParentCategoryGroups(
    expenseCategoryReport.value?.categories || [],
    categoryGroupLimit
  )
)

const incomeCategoryGroups = computed(() =>
  buildParentCategoryGroups(
    incomeCategoryReport.value?.categories || [],
    categoryGroupLimit
  )
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

const trendPeriod = computed(() => getTrendPeriod())
const trendGranularityLabel = computed(() => {
  if (trendPeriod.value === 'year') {
    return '按年汇总'
  }

  if (trendPeriod.value === 'month') {
    return '按月汇总'
  }

  if (trendPeriod.value === 'week') {
    return '按周汇总'
  }

  return '按日汇总'
})

const trendChartHeight = computed(() => (isCompactViewport.value ? 128 : 152))

let compactViewportMediaQuery = null

function getMonthStart(dateValue) {
  return `${dateValue.slice(0, 7)}-01`
}

function getDaysBetween(start, end) {
  const startTime = new Date(start + 'T00:00:00').getTime()
  const endTime = new Date(end + 'T00:00:00').getTime()
  return Math.floor((endTime - startTime) / 86400000) + 1
}

function handleCompactViewportChange(event) {
  isCompactViewport.value = event.matches
}

function selectPeriod(nextPeriod) {
  period.value = nextPeriod

  if (nextPeriod === 'custom') {
    normalizeCustomRange()
  }

  loadData()
}

function handleCustomRangeChange(field, value) {
  const nextValue = value || getLocalToday()

  if (field === 'start') {
    customStartDate.value = nextValue
  } else {
    customEndDate.value = nextValue
  }

  normalizeCustomRange(field)
  loadData()
}

function getCategoryStyle(category) {
  const color = getCategoryAccentColor(category)
  return color ? { color } : undefined
}

function getTransactionCategoryStyle(transaction) {
  const color = getCategoryAccentColor(transaction)
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

function normalizeCustomRange(changedField) {
  const fallbackDate = getLocalToday()

  if (!customStartDate.value && !customEndDate.value) {
    customStartDate.value = fallbackDate
    customEndDate.value = fallbackDate
  } else if (!customStartDate.value) {
    customStartDate.value = customEndDate.value || fallbackDate
  } else if (!customEndDate.value) {
    customEndDate.value = customStartDate.value || fallbackDate
  }

  if (customStartDate.value > customEndDate.value) {
    if (changedField === 'end') {
      customStartDate.value = customEndDate.value
    } else {
      customEndDate.value = customStartDate.value
    }
  }

  return {
    start: customStartDate.value,
    end: customEndDate.value
  }
}

function getPresetDateRange(
  periodValue = period.value,
  dateValue = dateStr.value
) {
  const d = new Date(dateValue + 'T00:00:00')
  const y = d.getFullYear()
  const m = d.getMonth()

  switch (periodValue) {
    case 'day':
      return { start: dateValue, end: dateValue }
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
      return { start: dateValue, end: dateValue }
  }
}

function getSelectedDateRange() {
  if (isCustomRange.value) {
    return normalizeCustomRange()
  }

  return getPresetDateRange()
}

function getReportQueryParams() {
  const baseParams = {
    period: period.value,
    currency: selectedCurrency.value || undefined
  }

  if (isCustomRange.value) {
    const { start, end } = getSelectedDateRange()
    return {
      ...baseParams,
      start_date: start,
      end_date: end
    }
  }

  return {
    ...baseParams,
    date: dateStr.value
  }
}

function getTrendPeriod() {
  if (!isCustomRange.value) {
    return period.value === 'year' ? 'month' : 'day'
  }

  const { start, end } = getSelectedDateRange()
  const totalDays = getDaysBetween(start, end)

  if (totalDays <= 31) {
    return 'day'
  }

  if (totalDays <= 180) {
    return 'week'
  }

  if (totalDays <= 730) {
    return 'month'
  }

  return 'year'
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
  recentTxns.value = []

  const reportParams = getReportQueryParams()
  const selectedRange = getSelectedDateRange()

  summary.value = await reportsStore
    .fetchSummary(reportParams)
    .then(() => reportsStore.summary)
  // loadRecentTransactions() 暂时不加载最近账目，避免接口响应过慢影响体验
  await Promise.all([
    loadCategories(reportParams),
    loadTrend(selectedRange.start, selectedRange.end)
  ])
}

async function loadRecentTransactions() {
  const params = new URLSearchParams({
    page: '1',
    pageSize: '10'
  })

  if (selectedCurrency.value) {
    params.set('currency', selectedCurrency.value)
  }

  const data = await api.get(`/transactions?${params.toString()}`)
  recentTxns.value = data.list
}

async function loadCategories(baseParams = getReportQueryParams()) {
  const [expenseData, incomeData] = await Promise.all([
    reportsStore.fetchCategoryReport({ ...baseParams, type: 'expense' }),
    reportsStore.fetchCategoryReport({ ...baseParams, type: 'income' })
  ])

  expenseCategoryReport.value = expenseData
  incomeCategoryReport.value = incomeData
}

async function loadTrend(start, end) {
  await reportsStore.fetchTrend({
    period: trendPeriod.value,
    start_date: start || getSelectedDateRange().start,
    end_date: end || getSelectedDateRange().end,
    currency: selectedCurrency.value || undefined
  })
  trendData.value = reportsStore.trend
}

function fmt(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

watch(
  [filterCurrencies, () => settingsStore.settings.default_currency],
  ([list]) => {
    if (!list.length) {
      if (selectedCurrency.value) {
        selectedCurrency.value = ''
      }
      loadData()
      return
    }

    if (
      !selectedCurrency.value ||
      !list.some(item => item.code === selectedCurrency.value)
    ) {
      selectedCurrency.value =
        settingsStore.getPreferredFilterCurrencyCode(list)
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

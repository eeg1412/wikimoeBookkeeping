<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="page-title">总览</h1>
      <div class="flex w-full flex-wrap gap-2 sm:w-auto">
        <select
          v-model="selectedCurrency"
          class="select flex-1 text-sm sm:w-36 sm:flex-none"
          :disabled="!usedCurrencies.length"
          @change="loadData"
        >
          <option v-if="!usedCurrencies.length" value="">暂无币种</option>
          <option
            v-for="currency in usedCurrencies"
            :key="currency.code"
            :value="currency.code"
          >
            {{ currency.symbol }} {{ currency.code }}
          </option>
        </select>
        <select
          v-model="period"
          class="select flex-1 text-sm sm:w-28 sm:flex-none"
          @change="loadData"
        >
          <option value="day">今日</option>
          <option value="week">本周</option>
          <option value="month">本月</option>
          <option value="year">本年</option>
        </select>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="收入"
        :value="summary?.income || 0"
        type="income"
        :prefix="currencySymbol"
        icon="income"
      />
      <StatCard
        title="支出"
        :value="summary?.expense || 0"
        type="expense"
        :prefix="currencySymbol"
        icon="expense"
      />
      <StatCard
        title="结余"
        :value="summary?.net || 0"
        type="balance"
        :prefix="currencySymbol"
        icon="balance"
        :sub="`共${(summary?.income_count || 0) + (summary?.expense_count || 0)}笔`"
      />
      <StatCard
        title="笔数"
        :value="`收${summary?.income_count || 0} / 支${summary?.expense_count || 0}`"
        icon="notes"
      />
    </div>

    <!-- Category donut -->
    <div v-if="categoryData?.categories?.length" class="card">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-bold text-on-surface">支出分类</h2>
        <router-link to="/reports" class="text-sm text-primary"
          >查看详情 →</router-link
        >
      </div>
      <SimpleChart
        type="donut"
        :data="donutData"
        center-label="总支出"
        :center-value="
          settingsStore.formatMoney(categoryData.total, selectedCurrency)
        "
      />
    </div>

    <!-- Recent transactions -->
    <div class="card">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-bold text-on-surface">最近账目</h2>
        <router-link to="/transactions" class="text-sm text-primary"
          >全部 →</router-link
        >
      </div>
      <div
        v-if="!recentTxns.length"
        class="text-center py-8 text-on-surface-secondary"
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
          <div class="flex-1 min-w-0">
            <div
              class="text-sm font-medium truncate"
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
    </div>

    <!-- Quick add FAB (desktop) -->
    <router-link
      to="/transactions/new"
      class="hidden lg:flex fixed bottom-8 right-8 w-14 h-14 rounded-full bg-primary text-white items-center justify-center text-2xl shadow-lg hover:bg-primary-dark transition-colors z-10"
      >+</router-link
    >
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { DEFAULT_CATEGORY_ICON } from '@shared/icon-names.js'
import { useSettingsStore } from '../stores/settings.js'
import { useReportsStore } from '../stores/reports.js'
import { api } from '../api/client.js'
import StatCard from '../components/StatCard.vue'
import SimpleChart from '../components/SimpleChart.vue'
import AppIcon from '../components/AppIcon.vue'
import {
  buildParentCategoryDonutData,
  getCategoryAccentColor
} from '../utils/category-ui.js'

const settingsStore = useSettingsStore()
const reportsStore = useReportsStore()

const period = ref('month')
const selectedCurrency = ref('')
const summary = ref(null)
const categoryData = ref(null)
const recentTxns = ref([])
const usedCurrencies = computed(() => settingsStore.usedCurrencies)

const currencySymbol = computed(() =>
  settingsStore.getCurrencySymbol(
    selectedCurrency.value || settingsStore.settings.default_currency
  )
)

const donutData = computed(() =>
  buildParentCategoryDonutData(categoryData.value?.categories || [], 8)
)

function getTransactionCategoryStyle(transaction) {
  const color = getCategoryAccentColor(transaction)
  return color ? { color } : undefined
}

async function loadData() {
  const today = new Date().toISOString().split('T')[0]
  const reportParams = new URLSearchParams({
    period: period.value,
    date: today
  })
  const transactionParams = new URLSearchParams({
    page: '1',
    pageSize: '10'
  })

  if (selectedCurrency.value) {
    reportParams.set('currency', selectedCurrency.value)
    transactionParams.set('currency', selectedCurrency.value)
  }

  const [s, c, t] = await Promise.all([
    api.get(`/reports/summary?${reportParams.toString()}`),
    api.get(`/reports/category?${reportParams.toString()}&type=expense`),
    api.get(`/transactions?${transactionParams.toString()}`)
  ])
  summary.value = s
  categoryData.value = c
  recentTxns.value = t.list
}

watch(
  usedCurrencies,
  list => {
    if (!list.length) {
      selectedCurrency.value = ''
      loadData()
      return
    }

    const nextCurrency = list[0].code

    if (!list.some(item => item.code === selectedCurrency.value)) {
      selectedCurrency.value = nextCurrency
    }

    loadData()
  },
  { immediate: true }
)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="page-title">总览</h1>
      <select v-model="period" class="select w-28 text-sm" @change="loadData">
        <option value="day">今日</option>
        <option value="week">本周</option>
        <option value="month">本月</option>
        <option value="year">本年</option>
      </select>
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
        :center-value="settingsStore.formatMoney(categoryData.total)"
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
          <AppIcon :name="txn.category_icon || 'folder'" :size="24" />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-on-surface truncate">
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
            {{ txn.type === 'income' ? '+' : '-' }}{{ displayTxnAmount(txn) }}
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
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings.js'
import { useReportsStore } from '../stores/reports.js'
import { api } from '../api/client.js'
import StatCard from '../components/StatCard.vue'
import SimpleChart from '../components/SimpleChart.vue'
import AppIcon from '../components/AppIcon.vue'

const settingsStore = useSettingsStore()
const reportsStore = useReportsStore()

const period = ref('month')
const summary = ref(null)
const categoryData = ref(null)
const recentTxns = ref([])

const currencySymbol = computed(() =>
  settingsStore.getCurrencySymbol(settingsStore.settings.default_currency)
)

const donutData = computed(() =>
  (categoryData.value?.categories || []).slice(0, 8).map(c => ({
    label: c.name,
    value: c.total,
    percentage: c.percentage
  }))
)

async function loadData() {
  const today = new Date().toISOString().split('T')[0]
  const [s, c, t] = await Promise.all([
    api.get(`/reports/summary?period=${period.value}&date=${today}`),
    api.get(
      `/reports/category?period=${period.value}&date=${today}&type=expense`
    ),
    api.get('/transactions?page=1&pageSize=10')
  ])
  summary.value = s
  categoryData.value = c
  recentTxns.value = t.list
}

function displayTxnAmount(txn) {
  const defaultCur = settingsStore.settings.default_currency
  if (txn.currency !== defaultCur && txn.exchange_rate === 1) {
    return settingsStore.formatMoney(txn.amount, txn.currency)
  }
  return settingsStore.formatMoney(txn.converted_amount)
}

onMounted(loadData)
</script>

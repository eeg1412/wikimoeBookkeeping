<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="page-title">账目</h1>
      <router-link to="/transactions/new" class="btn-primary btn-sm"
        >+ 记一笔</router-link
      >
    </div>

    <!-- Filters -->
    <div class="card">
      <div class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <select
          v-model="filterCurrency"
          class="select min-w-0 w-full text-sm sm:w-32"
          :disabled="!usedCurrencies.length"
          @change="applyFilter"
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
          v-model="filterType"
          class="select min-w-0 w-full text-sm sm:w-24"
          @change="applyFilter"
        >
          <option value="">全部</option>
          <option value="income">收入</option>
          <option value="expense">支出</option>
        </select>
        <DatePicker
          v-model="filterDateFrom"
          :week-start="Number(settingsStore.settings.week_start) || 1"
          clearable
          placeholder="开始日期"
          input-class="min-w-0 w-full text-sm sm:w-36"
          @change="applyFilter"
        />
        <span
          class="hidden self-center text-on-surface-secondary sm:inline-flex"
          >至</span
        >
        <DatePicker
          v-model="filterDateTo"
          :week-start="Number(settingsStore.settings.week_start) || 1"
          clearable
          align-right
          placeholder="结束日期"
          input-class="min-w-0 w-full text-sm sm:w-36"
          @change="applyFilter"
        />
        <button
          v-if="hasFilter"
          class="btn-ghost btn-sm col-span-2 sm:col-span-1"
          @click="clearFilter"
        >
          清除
        </button>
      </div>
    </div>

    <!-- Transaction list -->
    <div
      v-if="store.loading"
      class="text-center py-12 text-on-surface-secondary"
    >
      加载中...
    </div>
    <div
      v-else-if="!store.list.length"
      class="text-center py-12 text-on-surface-secondary"
    >
      暂无记录
    </div>
    <div v-else class="space-y-2">
      <div v-for="(group, date) in groupedList" :key="date">
        <div
          class="text-xs font-medium text-on-surface-secondary px-1 py-2 sticky top-14 lg:top-0 bg-surface z-10"
        >
          {{ date }}
          <span class="ml-2">
            收入
            {{ settingsStore.formatMoney(group.income, activeCurrencyCode) }}
            支出
            {{ settingsStore.formatMoney(group.expense, activeCurrencyCode) }}
          </span>
        </div>
        <div class="card divide-y divide-border !p-0 overflow-hidden">
          <div
            v-for="txn in group.items"
            :key="txn.id"
            class="flex items-center gap-3 px-4 py-3 hover:bg-surface-secondary/50 transition-colors cursor-pointer"
            @click="$router.push(`/transactions/${txn.id}/edit`)"
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
              <div class="text-xs text-on-surface-secondary truncate">
                {{ txn.note || '无备注' }}
                <span
                  v-if="txn.source !== 'manual'"
                  class="badge text-[10px] ml-1"
                  :class="
                    txn.source === 'recurring'
                      ? 'badge-income'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  "
                >
                  {{ txn.source === 'recurring' ? '周期' : '导入' }}
                </span>
              </div>
            </div>
            <div class="text-right shrink-0">
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
            <button
              class="shrink-0 ml-1 p-1.5 rounded-lg text-on-surface-secondary hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              title="删除"
              @click="askDelete(txn, $event)"
            >
              <AppIcon name="delete" :size="18" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="store.total > store.pageSize"
      class="flex justify-center gap-2 pt-2"
    >
      <button
        class="btn-secondary btn-sm"
        :disabled="store.page <= 1"
        @click="changePage(store.page - 1)"
      >
        上一页
      </button>
      <span class="text-sm text-on-surface-secondary self-center">
        {{ store.page }} / {{ Math.ceil(store.total / store.pageSize) }}
      </span>
      <button
        class="btn-secondary btn-sm"
        :disabled="store.page >= Math.ceil(store.total / store.pageSize)"
        @click="changePage(store.page + 1)"
      >
        下一页
      </button>
    </div>

    <ConfirmDialog
      :show="showDeleteConfirm"
      title="删除账目"
      message="确定要删除这条记录吗？此操作不可撤销。"
      confirm-text="删除"
      danger
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { DEFAULT_CATEGORY_ICON } from '@shared/icon-names.js'
import { useTransactionsStore } from '../stores/transactions.js'
import { useSettingsStore } from '../stores/settings.js'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import AppIcon from '../components/AppIcon.vue'
import { getCategoryAccentColor } from '../utils/category-ui.js'
import DatePicker from '../components/DatePicker.vue'

const store = useTransactionsStore()
const settingsStore = useSettingsStore()

const showDeleteConfirm = ref(false)
const pendingDeleteId = ref(null)

function askDelete(txn, e) {
  e.stopPropagation()
  pendingDeleteId.value = txn.id
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (pendingDeleteId.value) {
    await store.remove(pendingDeleteId.value)
  }
  showDeleteConfirm.value = false
  pendingDeleteId.value = null
}

function cancelDelete() {
  showDeleteConfirm.value = false
  pendingDeleteId.value = null
}

function getTransactionCategoryStyle(transaction) {
  const color = getCategoryAccentColor(transaction)
  return color ? { color } : undefined
}

const filterType = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const filterCurrency = ref('')
const usedCurrencies = computed(() => settingsStore.usedCurrencies)
const activeCurrencyCode = computed(
  () => filterCurrency.value || settingsStore.settings.default_currency
)

const hasFilter = computed(
  () => filterType.value || filterDateFrom.value || filterDateTo.value
)

const groupedList = computed(() => {
  const groups = {}
  for (const txn of store.list) {
    if (!groups[txn.date]) {
      groups[txn.date] = { items: [], income: 0, expense: 0 }
    }
    groups[txn.date].items.push(txn)
    if (txn.type === 'income') groups[txn.date].income += txn.amount
    else groups[txn.date].expense += txn.amount
  }
  return groups
})

function applyFilter() {
  store.setFilters({
    currency: filterCurrency.value || undefined,
    type: filterType.value || undefined,
    date_from: filterDateFrom.value || undefined,
    date_to: filterDateTo.value || undefined
  })
  store.fetch()
}

function clearFilter() {
  filterType.value = ''
  filterDateFrom.value = ''
  filterDateTo.value = ''
  applyFilter()
}

function changePage(p) {
  store.page = p
  store.fetch()
}

watch(
  usedCurrencies,
  list => {
    if (!list.length) {
      filterCurrency.value = ''
      applyFilter()
      return
    }

    const nextCurrency = list[0].code

    if (!list.some(item => item.code === filterCurrency.value)) {
      filterCurrency.value = nextCurrency
    }

    applyFilter()
  },
  { immediate: true }
)
</script>

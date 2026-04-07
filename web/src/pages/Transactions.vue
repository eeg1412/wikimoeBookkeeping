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
      <div class="flex flex-wrap gap-2">
        <select
          v-model="filterType"
          class="select text-sm w-24"
          @change="applyFilter"
        >
          <option value="">全部</option>
          <option value="income">收入</option>
          <option value="expense">支出</option>
        </select>
        <input
          v-model="filterDateFrom"
          type="date"
          class="input text-sm w-36"
          @change="applyFilter"
        />
        <span class="text-on-surface-secondary self-center">至</span>
        <input
          v-model="filterDateTo"
          type="date"
          class="input text-sm w-36"
          @change="applyFilter"
        />
        <button v-if="hasFilter" class="btn-ghost btn-sm" @click="clearFilter">
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
            收入 {{ settingsStore.formatMoney(group.income) }} 支出
            {{ settingsStore.formatMoney(group.expense) }}
          </span>
        </div>
        <div class="card divide-y divide-border !p-0 overflow-hidden">
          <div
            v-for="txn in group.items"
            :key="txn.id"
            class="flex items-center gap-3 px-4 py-3 hover:bg-surface-secondary/50 transition-colors cursor-pointer"
            @click="$router.push(`/transactions/${txn.id}/edit`)"
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
              <div
                v-if="
                  txn.currency !== settingsStore.settings.default_currency &&
                  txn.exchange_rate !== 1
                "
                class="text-[10px] text-on-surface-secondary"
              >
                ≈ {{ settingsStore.formatMoney(txn.converted_amount) }}
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
import { ref, computed, onMounted } from 'vue'
import { useTransactionsStore } from '../stores/transactions.js'
import { useSettingsStore } from '../stores/settings.js'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import AppIcon from '../components/AppIcon.vue'

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

const filterType = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')

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
    if (txn.type === 'income') groups[txn.date].income += txn.converted_amount
    else groups[txn.date].expense += txn.converted_amount
  }
  return groups
})

function applyFilter() {
  store.setFilters({
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

onMounted(() => store.fetch())
</script>

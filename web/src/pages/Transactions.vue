<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-3">
          <button
            v-if="isCategoryScopedPage"
            class="btn-ghost btn-sm"
            @click="goBackToCategories"
          >
            ← 返回
          </button>
          <h1 class="page-title truncate">{{ pageTitle }}</h1>
        </div>
        <p
          v-if="pageDescription"
          class="mt-1 text-sm text-on-surface-secondary"
        >
          {{ pageDescription }}
        </p>
      </div>
      <router-link :to="createTransactionRoute" class="btn-primary btn-sm">
        + 记一笔
      </router-link>
    </div>

    <div class="card">
      <div class="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap lg:items-center">
        <select
          v-model="filterCurrency"
          class="select min-w-0 w-full text-sm sm:w-32"
          :disabled="!filterCurrencies.length"
          @change="applyFilter"
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
        <select
          v-if="!isCategoryScopedPage"
          v-model="selectedTypeValue"
          class="select min-w-0 w-full text-sm sm:w-24"
          :disabled="typeFilterDisabled"
          @change="handleTypeChange"
        >
          <option value="">全部</option>
          <option value="expense">支出</option>
          <option value="income">收入</option>
        </select>
        <select
          v-if="!isCategoryScopedPage"
          v-model="selectedParentCategoryId"
          class="select min-w-0 w-full text-sm sm:w-40"
          :disabled="
            parentCategoryFilterDisabled || !parentCategoryOptions.length
          "
          @change="handleParentCategoryChange"
        >
          <option value="">{{ parentCategoryPlaceholder }}</option>
          <option
            v-for="category in parentCategoryOptions"
            :key="category.id"
            :value="String(category.id)"
            :style="getParentCategoryOptionStyle(category)"
          >
            {{ formatParentCategoryOption(category) }}
          </option>
        </select>
        <select
          v-if="!isCategoryScopedPage"
          v-model="selectedChildCategoryId"
          class="select min-w-0 w-full text-sm sm:w-40"
          :disabled="childCategoryFilterDisabled"
          @change="applyFilter"
        >
          <option value="">{{ childCategoryPlaceholder }}</option>
          <option
            v-for="category in childCategoryOptions"
            :key="category.id"
            :value="String(category.id)"
          >
            {{ category.name }}
          </option>
        </select>
        <DatePicker
          v-model="filterDateFrom"
          :week-start="Number(settingsStore.settings.week_start) || 1"
          clearable
          placeholder="开始日期"
          input-class="min-w-0 w-full text-sm sm:w-36"
          @change="handleFilterDateChange('from', $event)"
        />
        <span
          class="hidden self-center text-on-surface-secondary lg:inline-flex"
        >
          至
        </span>
        <DatePicker
          v-model="filterDateTo"
          :week-start="Number(settingsStore.settings.week_start) || 1"
          clearable
          align-right
          placeholder="结束日期"
          input-class="min-w-0 w-full text-sm sm:w-36"
          @change="handleFilterDateChange('to', $event)"
        />
        <button
          v-if="hasFilter"
          class="btn-ghost btn-sm col-span-2 lg:col-span-1"
          @click="clearFilter"
        >
          清除
        </button>
      </div>
    </div>

    <div
      v-if="store.loading"
      class="py-12 text-center text-on-surface-secondary"
    >
      加载中...
    </div>
    <div
      v-else-if="!store.list.length"
      class="py-12 text-center text-on-surface-secondary"
    >
      暂无记录
    </div>
    <div v-else class="space-y-2">
      <div v-for="(group, date) in groupedList" :key="date">
        <div
          class="sticky top-14 z-10 bg-surface-secondary px-1 py-2 text-xs font-medium text-on-surface-secondary lg:top-0"
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
            class="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-secondary/50"
            @click="openTransaction(txn.id)"
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
              <div class="truncate text-xs text-on-surface-secondary">
                {{ txn.note || '无备注' }}
                <span
                  v-if="txn.source !== 'manual'"
                  class="badge ml-1 text-[10px]"
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
            <div class="shrink-0 text-right">
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
              class="ml-1 shrink-0 rounded-lg p-1.5 text-red-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20"
              title="删除"
              @click="askDelete(txn, $event)"
            >
              <AppIcon name="delete" :size="18" />
            </button>
          </div>
        </div>
      </div>
    </div>

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
      <span class="self-center text-sm text-on-surface-secondary">
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
import { computed, ref, toRefs, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DEFAULT_CATEGORY_ICON } from '@shared/icon-names.js'
import { useTransactionsStore } from '../stores/transactions.js'
import { useSettingsStore } from '../stores/settings.js'
import { useCategoriesStore } from '../stores/categories.js'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import AppIcon from '../components/AppIcon.vue'
import { getCategoryAccentColor } from '../utils/category-ui.js'
import DatePicker from '../components/DatePicker.vue'
import { useCachedViewState } from '../composables/useCachedViewState.js'

const BASE_TRANSACTIONS_LIST_STATE_KEY = 'transactions:list'

const route = useRoute()
const router = useRouter()
const store = useTransactionsStore()
const settingsStore = useSettingsStore()
const categoriesStore = useCategoriesStore()

const showDeleteConfirm = ref(false)
const pendingDeleteId = ref(null)

const scopedCategoryId = computed(() => {
  const nextCategoryId = Number(route.params.categoryId)

  return Number.isInteger(nextCategoryId) && nextCategoryId > 0
    ? nextCategoryId
    : null
})
const isCategoryScopedPage = computed(() => scopedCategoryId.value !== null)
const scopedCategory = computed(
  () =>
    categoriesStore.flatList.find(
      category => category.id === scopedCategoryId.value
    ) || null
)
const pageTitle = computed(() => {
  if (!isCategoryScopedPage.value) {
    return '账目'
  }

  const categoryLabel = formatCategoryPathName(scopedCategory.value)
  return categoryLabel ? `${categoryLabel}账目` : '分类账目'
})
const pageDescription = computed(() => {
  const categoryLabel = formatCategoryPathName(scopedCategory.value)

  if (categoryLabel) {
    return `仅显示分类「${categoryLabel}」下的账目。`
  }

  return isCategoryScopedPage.value ? '仅显示当前分类下的账目。' : ''
})
const transactionsListStateKey = computed(() =>
  isCategoryScopedPage.value
    ? `${BASE_TRANSACTIONS_LIST_STATE_KEY}:category:${scopedCategoryId.value}`
    : BASE_TRANSACTIONS_LIST_STATE_KEY
)

const { state: listState, resetState: resetListState } = useCachedViewState(
  transactionsListStateKey,
  {
    filterType: '',
    filterDateFrom: '',
    filterDateTo: '',
    filterCurrency: '',
    filterParentCategoryId: '',
    filterCategoryId: '',
    page: 1
  }
)
const {
  filterType,
  filterDateFrom,
  filterDateTo,
  filterCurrency,
  filterParentCategoryId,
  filterCategoryId,
  page
} = toRefs(listState)

const parentCategoryTypeOrder = {
  expense: 0,
  income: 1
}

function getParentCategoryOptionStyle(category) {
  if (!category) {
    return undefined
  }

  return {
    backgroundColor:
      category.type === 'expense'
        ? 'color-mix(in srgb, rgb(var(--color-surface)) 88%, rgb(239 68 68) 12%)'
        : 'color-mix(in srgb, rgb(var(--color-surface)) 88%, rgb(34 197 94) 12%)'
  }
}

const selectedTypeValue = computed({
  get() {
    return scopedCategory.value?.type || filterType.value
  },
  set(value) {
    if (isCategoryScopedPage.value) {
      return
    }

    filterType.value = value
  }
})
const parentCategoryOptions = computed(() => {
  const activeType = filterType.value || scopedCategory.value?.type || ''
  const categories = categoriesStore.tree.filter(
    category => !activeType || category.type === activeType
  )

  if (activeType) {
    return categories
  }

  return [...categories].sort(
    (left, right) =>
      (parentCategoryTypeOrder[left.type] ?? Number.MAX_SAFE_INTEGER) -
      (parentCategoryTypeOrder[right.type] ?? Number.MAX_SAFE_INTEGER)
  )
})
const selectedParentCategoryId = computed({
  get() {
    if (!scopedCategory.value) {
      return isCategoryScopedPage.value ? '' : filterParentCategoryId.value
    }

    return String(scopedCategory.value.parent_id || scopedCategory.value.id)
  },
  set(value) {
    if (isCategoryScopedPage.value) {
      return
    }

    if (filterParentCategoryId.value !== value) {
      filterCategoryId.value = ''
    }

    filterParentCategoryId.value = value
  }
})
const selectedParentCategory = computed(
  () =>
    parentCategoryOptions.value.find(
      category => String(category.id) === selectedParentCategoryId.value
    ) ||
    categoriesStore.tree.find(
      category => String(category.id) === selectedParentCategoryId.value
    ) ||
    null
)
const childCategoryOptions = computed(() => {
  return selectedParentCategory.value?.children || []
})
const selectedChildCategoryId = computed({
  get() {
    if (scopedCategory.value?.parent_id) {
      return String(scopedCategory.value.id)
    }

    return filterCategoryId.value
  },
  set(value) {
    if (scopedCategory.value?.parent_id) {
      return
    }

    filterCategoryId.value = value
  }
})
const typeFilterDisabled = computed(() => isCategoryScopedPage.value)
const parentCategoryFilterDisabled = computed(() => isCategoryScopedPage.value)
const childCategoryFilterDisabled = computed(
  () => !!scopedCategory.value?.parent_id || !childCategoryOptions.value.length
)
const parentCategoryPlaceholder = computed(() =>
  isCategoryScopedPage.value ? '当前分类' : '全部分类'
)
const childCategoryPlaceholder = computed(() => {
  if (scopedCategory.value?.parent_id) {
    return '当前子分类'
  }

  if (!selectedParentCategoryId.value) {
    return '先选分类'
  }

  return childCategoryOptions.value.length ? '全部子分类' : '无子分类'
})
const filterCurrencies = computed(() => settingsStore.getFilterCurrencies())
const activeCurrencyCode = computed(
  () => filterCurrency.value || settingsStore.settings.default_currency
)
const hasFilter = computed(
  () =>
    filterType.value ||
    filterDateFrom.value ||
    filterDateTo.value ||
    filterParentCategoryId.value ||
    filterCategoryId.value
)
const groupedList = computed(() => {
  const groups = {}

  for (const txn of store.list) {
    if (!groups[txn.date]) {
      groups[txn.date] = { items: [], income: 0, expense: 0 }
    }

    groups[txn.date].items.push(txn)

    if (txn.type === 'income') {
      groups[txn.date].income += txn.amount
    } else {
      groups[txn.date].expense += txn.amount
    }
  }

  return groups
})
const createTransactionRoute = computed(() => {
  const query = {}

  if (isCategoryScopedPage.value) {
    query.category_id =
      selectedChildCategoryId.value || String(scopedCategoryId.value)
    query.return_to = route.fullPath
  }

  return {
    name: 'TransactionNew',
    query
  }
})

function askDelete(txn, event) {
  event.stopPropagation()
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

function formatCategoryPathName(category) {
  if (!category) {
    return ''
  }

  const parentCategory = category.parent_id
    ? categoriesStore.flatList.find(item => item.id === category.parent_id)
    : null

  return parentCategory
    ? `${parentCategory.name} / ${category.name}`
    : category.name
}

function formatParentCategoryOption(category) {
  if (filterType.value || scopedCategory.value?.type) {
    return category.name
  }

  return `${category.type === 'income' ? '收入' : '支出'} / ${category.name}`
}

function resolveCategoryFilterId() {
  if (scopedCategory.value?.parent_id) {
    return scopedCategory.value.id
  }

  if (filterCategoryId.value) {
    return Number(filterCategoryId.value)
  }

  if (scopedCategoryId.value) {
    return scopedCategoryId.value
  }

  if (filterParentCategoryId.value) {
    return Number(filterParentCategoryId.value)
  }

  return undefined
}

function getCurrentFilters() {
  return {
    currency: filterCurrency.value || undefined,
    type: filterType.value || undefined,
    category_id: resolveCategoryFilterId(),
    date_from: filterDateFrom.value || undefined,
    date_to: filterDateTo.value || undefined
  }
}

function normalizeFilterDateRange(changedField) {
  if (!filterDateFrom.value || !filterDateTo.value) {
    return
  }

  if (filterDateFrom.value <= filterDateTo.value) {
    return
  }

  if (changedField === 'to') {
    filterDateFrom.value = filterDateTo.value
    return
  }

  filterDateTo.value = filterDateFrom.value
}

function handleTypeChange() {
  if (
    filterParentCategoryId.value &&
    !parentCategoryOptions.value.some(
      category => String(category.id) === filterParentCategoryId.value
    )
  ) {
    filterParentCategoryId.value = ''
    filterCategoryId.value = ''
  }

  applyFilter()
}

function handleParentCategoryChange() {
  applyFilter()
}

function handleFilterDateChange(field, value) {
  if (field === 'from') {
    filterDateFrom.value = value
  } else {
    filterDateTo.value = value
  }

  normalizeFilterDateRange(field)
  applyFilter()
}

function syncListState({ resetPage = false } = {}) {
  if (resetPage) {
    page.value = 1
  }

  store.restoreState({
    filters: getCurrentFilters(),
    page: page.value
  })
}

function applyFilter() {
  syncListState({ resetPage: true })
  store.fetch()
}

function clearFilter() {
  resetListState({
    filterCurrency: filterCurrency.value
  })
  applyFilter()
}

function changePage(nextPage) {
  page.value = nextPage
  syncListState()
  store.fetch()
}

function openTransaction(id) {
  const query = isCategoryScopedPage.value
    ? { return_to: route.fullPath }
    : undefined

  router.push({
    name: 'TransactionEdit',
    params: { id },
    query
  })
}

function goBackToCategories() {
  router.push({
    name: 'Categories',
    query: scopedCategory.value?.type
      ? { type: scopedCategory.value.type }
      : undefined
  })
}

watch(
  () => childCategoryOptions.value,
  options => {
    if (
      filterCategoryId.value &&
      !options.some(category => String(category.id) === filterCategoryId.value)
    ) {
      filterCategoryId.value = ''
    }
  }
)

watch(
  () => store.page,
  nextPage => {
    if (nextPage && page.value !== nextPage) {
      page.value = nextPage
    }
  }
)

watch(
  transactionsListStateKey,
  () => {
    syncListState()
    store.fetch()
  },
  { flush: 'post' }
)

watch(
  [filterCurrencies, () => settingsStore.settings.default_currency],
  ([list]) => {
    if (!list.length) {
      if (filterCurrency.value) {
        filterCurrency.value = ''
      }

      syncListState()
      store.fetch()
      return
    }

    if (
      !filterCurrency.value ||
      !list.some(item => item.code === filterCurrency.value)
    ) {
      filterCurrency.value = settingsStore.getPreferredFilterCurrencyCode(list)
    }

    syncListState()
    store.fetch()
  },
  { immediate: true, flush: 'post' }
)
</script>

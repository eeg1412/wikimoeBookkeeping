import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api/client.js'
import { useSettingsStore } from './settings.js'

function normalizeFilters(filters = {}) {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== ''
    )
  )
}

export const useTransactionsStore = defineStore('transactions', () => {
  const settingsStore = useSettingsStore()
  const list = ref([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const loading = ref(false)
  const filters = ref({})

  async function fetch(params = {}) {
    loading.value = true
    try {
      const merged = {
        page: page.value,
        pageSize: pageSize.value,
        ...filters.value,
        ...params
      }
      const qs = Object.entries(merged)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&')
      const data = await api.get(`/transactions?${qs}`)
      list.value = data.list
      total.value = data.total
      page.value = data.page
      pageSize.value = data.pageSize
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    const result = await api.post('/transactions', data)
    await Promise.all([fetch(), settingsStore.fetchUsedCurrencies()])
    return result
  }

  async function update(id, data) {
    const result = await api.put(`/transactions/${id}`, data)
    await Promise.all([fetch(), settingsStore.fetchUsedCurrencies()])
    return result
  }

  async function remove(id) {
    await api.delete(`/transactions/${id}`)
    await Promise.all([fetch(), settingsStore.fetchUsedCurrencies()])
  }

  function setFilters(nextFilters, options = {}) {
    filters.value = normalizeFilters(nextFilters)
    if (options.resetPage ?? true) {
      page.value = 1
    }
  }

  function setPage(nextPage) {
    const normalizedPage = Number(nextPage)
    page.value =
      Number.isInteger(normalizedPage) && normalizedPage > 0
        ? normalizedPage
        : 1
  }

  function restoreState(state = {}) {
    filters.value = normalizeFilters(state.filters)
    setPage(state.page)
  }

  return {
    list,
    total,
    page,
    pageSize,
    loading,
    filters,
    fetch,
    create,
    update,
    remove,
    setFilters,
    setPage,
    restoreState
  }
})

import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api/client.js'

export const useTransactionsStore = defineStore('transactions', () => {
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
    await fetch()
    return result
  }

  async function update(id, data) {
    const result = await api.put(`/transactions/${id}`, data)
    await fetch()
    return result
  }

  async function remove(id) {
    await api.delete(`/transactions/${id}`)
    await fetch()
  }

  function setFilters(f) {
    filters.value = f
    page.value = 1
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
    setFilters
  }
})

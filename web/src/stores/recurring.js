import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api/client.js'

export const useRecurringStore = defineStore('recurring', () => {
  const rules = ref([])
  const loading = ref(false)

  async function fetch() {
    loading.value = true
    try {
      rules.value = await api.get('/recurring')
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    const result = await api.post('/recurring', data)
    await fetch()
    return result
  }

  async function update(id, data) {
    const result = await api.put(`/recurring/${id}`, data)
    await fetch()
    return result
  }

  async function remove(id) {
    await api.delete(`/recurring/${id}`)
    await fetch()
  }

  async function getLogs(id, params = {}) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join('&')
    return await api.get(`/recurring/${id}/logs?${qs}`)
  }

  return { rules, loading, fetch, create, update, remove, getLogs }
})

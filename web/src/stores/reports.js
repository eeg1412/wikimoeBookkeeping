import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api/client.js'

export const useReportsStore = defineStore('reports', () => {
  const summary = ref(null)
  const trend = ref([])
  const categoryReport = ref(null)
  const loading = ref(false)

  async function fetchSummary(params) {
    loading.value = true
    try {
      const qs = toQs(params)
      summary.value = await api.get(`/reports/summary?${qs}`)
    } finally {
      loading.value = false
    }
  }

  async function fetchTrend(params) {
    const qs = toQs(params)
    trend.value = await api.get(`/reports/trend?${qs}`)
  }

  async function fetchCategoryReport(params) {
    const qs = toQs(params)
    categoryReport.value = await api.get(`/reports/category?${qs}`)
    return categoryReport.value
  }

  function toQs(obj) {
    return Object.entries(obj)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&')
  }

  return {
    summary,
    trend,
    categoryReport,
    loading,
    fetchSummary,
    fetchTrend,
    fetchCategoryReport
  }
})

import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api/client.js'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref({
    default_currency: 'CNY',
    timezone: 'Asia/Shanghai',
    theme_color: 'blue',
    dark_mode: 'system',
    week_start: '1'
  })
  const currencies = ref([])
  const usedCurrencies = ref([])
  const icons = ref([])
  const loading = ref(false)

  async function fetch() {
    loading.value = true
    try {
      const [s, c, i, used] = await Promise.all([
        api.get('/settings'),
        api.get('/currencies'),
        api.get('/icons'),
        api.get('/currencies/used')
      ])
      settings.value = { ...settings.value, ...s }
      currencies.value = c
      icons.value = i
      usedCurrencies.value = used
      applyTheme()
    } finally {
      loading.value = false
    }
  }

  async function fetchUsedCurrencies() {
    usedCurrencies.value = await api.get('/currencies/used')
  }

  async function update(data) {
    settings.value = await api.put('/settings', data)
    applyTheme()
  }

  function applyTheme() {
    const html = document.documentElement
    html.setAttribute('data-theme', settings.value.theme_color || 'blue')

    const dm = settings.value.dark_mode
    if (dm === 'dark') {
      html.classList.add('dark')
    } else if (dm === 'light') {
      html.classList.remove('dark')
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
      }
    }
  }

  function getCurrencySymbol(code) {
    const c =
      currencies.value.find(currency => currency.code === code) ||
      usedCurrencies.value.find(currency => currency.code === code)
    return c ? c.symbol : code
  }

  function formatMoney(amount, currencyCode) {
    const sym = getCurrencySymbol(
      currencyCode || settings.value.default_currency
    )
    return `${sym}${Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Watch system dark mode
  if (typeof window !== 'undefined') {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (settings.value.dark_mode === 'system') applyTheme()
      })
  }

  return {
    settings,
    currencies,
    usedCurrencies,
    icons,
    loading,
    fetch,
    fetchUsedCurrencies,
    update,
    applyTheme,
    getCurrencySymbol,
    formatMoney
  }
})

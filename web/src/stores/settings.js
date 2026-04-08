import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api/client.js'
import {
  applyThemePreference,
  getStoredThemePreferences
} from '../utils/theme.js'

const storedThemePreferences = getStoredThemePreferences()

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref({
    default_currency: 'CNY',
    timezone: 'Asia/Shanghai',
    theme_color: storedThemePreferences.themeColor,
    dark_mode: storedThemePreferences.darkMode,
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
    const nextSettings = await api.put('/settings', data)
    settings.value = { ...settings.value, ...nextSettings }
    applyTheme()
  }

  function applyTheme(themeSettings = settings.value, options = {}) {
    const appliedPreferences = applyThemePreference(themeSettings, {
      persist: options.persist ?? true
    })

    if (themeSettings === settings.value) {
      settings.value = {
        ...settings.value,
        theme_color: appliedPreferences.themeColor,
        dark_mode: appliedPreferences.darkMode
      }
    }

    return appliedPreferences
  }

  function getCurrencySymbol(code) {
    const c =
      currencies.value.find(currency => currency.code === code) ||
      usedCurrencies.value.find(currency => currency.code === code)
    return c ? c.symbol : code
  }

  function getFilterCurrencies(source = usedCurrencies.value) {
    const list = Array.isArray(source) ? [...source] : []
    const defaultCurrencyCode = settings.value.default_currency

    if (!defaultCurrencyCode) {
      return list
    }

    if (list.some(currency => currency.code === defaultCurrencyCode)) {
      return list
    }

    const defaultCurrency =
      currencies.value.find(
        currency => currency.code === defaultCurrencyCode
      ) ||
      usedCurrencies.value.find(
        currency => currency.code === defaultCurrencyCode
      )

    if (!defaultCurrency) {
      return list
    }

    return [defaultCurrency, ...list]
  }

  function getPreferredFilterCurrencyCode(source = usedCurrencies.value) {
    const list = getFilterCurrencies(source)

    if (!list.length) {
      return ''
    }

    return list.some(
      currency => currency.code === settings.value.default_currency
    )
      ? settings.value.default_currency
      : list[0].code
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
    getFilterCurrencies,
    getPreferredFilterCurrencyCode,
    getCurrencySymbol,
    formatMoney
  }
})

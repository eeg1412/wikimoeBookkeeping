const THEME_COLOR_STORAGE_KEY = 'wikimoe-theme-color'
const DARK_MODE_STORAGE_KEY = 'wikimoe-dark-mode'
const DEFAULT_THEME_COLOR = 'blue'
const DEFAULT_DARK_MODE = 'system'
const VALID_DARK_MODES = new Set(['system', 'light', 'dark'])

function canUseThemeApi() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function safeGetStorageValue(key) {
  if (!canUseThemeApi()) return null

  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetStorageValue(key, value) {
  if (!canUseThemeApi()) return

  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Ignore storage write failures and keep runtime theme state usable.
  }
}

function normalizeThemeColor(value) {
  const normalizedValue = String(value ?? '').trim()
  return normalizedValue || DEFAULT_THEME_COLOR
}

function normalizeDarkMode(value) {
  return VALID_DARK_MODES.has(value) ? value : DEFAULT_DARK_MODE
}

export function getStoredThemePreferences() {
  return {
    themeColor: normalizeThemeColor(
      safeGetStorageValue(THEME_COLOR_STORAGE_KEY)
    ),
    darkMode: normalizeDarkMode(safeGetStorageValue(DARK_MODE_STORAGE_KEY))
  }
}

export function normalizeThemePreferences(source = {}) {
  return {
    themeColor: normalizeThemeColor(source.theme_color ?? source.themeColor),
    darkMode: normalizeDarkMode(source.dark_mode ?? source.darkMode)
  }
}

export function resolveIsDarkMode(darkMode = DEFAULT_DARK_MODE) {
  if (darkMode === 'dark') return true
  if (darkMode === 'light') return false
  if (!canUseThemeApi()) return false

  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function persistThemePreferences(source = {}) {
  const preferences = normalizeThemePreferences(source)

  safeSetStorageValue(THEME_COLOR_STORAGE_KEY, preferences.themeColor)
  safeSetStorageValue(DARK_MODE_STORAGE_KEY, preferences.darkMode)

  return preferences
}

export function applyThemePreference(source = {}, options = {}) {
  const preferences = normalizeThemePreferences(source)
  const isDark = resolveIsDarkMode(preferences.darkMode)

  if (canUseThemeApi()) {
    const html = document.documentElement

    html.setAttribute('data-theme', preferences.themeColor)
    html.classList.toggle('dark', isDark)

    if (options.persist) {
      persistThemePreferences(preferences)
    }
  }

  return {
    ...preferences,
    isDark
  }
}

export function initializeThemeFromCache() {
  return applyThemePreference(getStoredThemePreferences(), {
    persist: false
  })
}

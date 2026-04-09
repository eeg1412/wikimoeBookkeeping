import { ref, toRaw } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'wikimoe:view-state'

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function cloneState(value) {
  const normalizedValue =
    value && typeof value === 'object' ? toRaw(value) : value

  if (normalizedValue == null || typeof normalizedValue !== 'object') {
    return normalizedValue
  }

  return JSON.parse(JSON.stringify(normalizedValue))
}

function mergeState(defaults, cached) {
  if (!isPlainObject(defaults)) {
    return cloneState(cached === undefined ? defaults : cached)
  }

  const result = cloneState(defaults)

  if (!isPlainObject(cached)) {
    return result
  }

  for (const [key, value] of Object.entries(cached)) {
    if (isPlainObject(result[key]) && isPlainObject(value)) {
      result[key] = mergeState(result[key], value)
      continue
    }

    result[key] = cloneState(value)
  }

  return result
}

function loadEntries() {
  if (typeof window === 'undefined') {
    return {}
  }

  const raw = window.sessionStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw)
    return isPlainObject(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function persistEntries(entries) {
  if (typeof window === 'undefined') {
    return
  }

  if (!Object.keys(entries).length) {
    window.sessionStorage.removeItem(STORAGE_KEY)
    return
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export const useViewStateStore = defineStore('viewState', () => {
  const entries = ref(loadEntries())

  function getState(key, defaults = {}) {
    return mergeState(defaults, entries.value[key])
  }

  function setState(key, state) {
    entries.value = {
      ...entries.value,
      [key]: cloneState(state)
    }
    persistEntries(entries.value)
  }

  function clearState(key) {
    if (!(key in entries.value)) {
      return
    }

    const nextEntries = { ...entries.value }
    delete nextEntries[key]
    entries.value = nextEntries
    persistEntries(entries.value)
  }

  function clearAll() {
    entries.value = {}
    persistEntries(entries.value)
  }

  return {
    entries,
    getState,
    setState,
    clearState,
    clearAll
  }
})

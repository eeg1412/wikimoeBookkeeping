import { ref } from 'vue'
import { defineStore } from 'pinia'

const DEFAULT_DURATION = {
  success: 2400,
  info: 3200,
  error: 4000
}

const activeTimers = new Map()
let nextToastId = 1

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([])

  function show({ type = 'info', title, message, duration } = {}) {
    const normalizedMessage = String(message || '').trim()

    if (!normalizedMessage) {
      return null
    }

    const toast = {
      id: nextToastId++,
      type,
      title: title || getDefaultTitle(type),
      message: normalizedMessage,
      duration: duration ?? DEFAULT_DURATION[type] ?? DEFAULT_DURATION.info
    }

    toasts.value = [...toasts.value, toast]
    startTimer(toast)
    return toast.id
  }

  function success(message, options = {}) {
    return show({ ...options, type: 'success', message })
  }

  function info(message, options = {}) {
    return show({ ...options, type: 'info', message })
  }

  function error(message, options = {}) {
    return show({ ...options, type: 'error', message })
  }

  function remove(id) {
    clearTimer(id)
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }

  function clear() {
    activeTimers.forEach(timer => clearTimeout(timer))
    activeTimers.clear()
    toasts.value = []
  }

  function startTimer(toast) {
    clearTimer(toast.id)

    if (!toast.duration || toast.duration <= 0) {
      return
    }

    const timer = setTimeout(() => {
      remove(toast.id)
    }, toast.duration)

    activeTimers.set(toast.id, timer)
  }

  return {
    toasts,
    show,
    success,
    info,
    error,
    remove,
    clear
  }
})

function clearTimer(id) {
  const timer = activeTimers.get(id)

  if (!timer) {
    return
  }

  clearTimeout(timer)
  activeTimers.delete(id)
}

function getDefaultTitle(type) {
  switch (type) {
    case 'success':
      return '操作成功'
    case 'error':
      return '操作失败'
    default:
      return '提示'
  }
}

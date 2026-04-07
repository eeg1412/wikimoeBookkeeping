const BASE = '/api'

// ─── Token 刷新状态管理 ───
let isRefreshing = false
let refreshQueue = [] // 等待刷新完成的请求队列

function resolveQueue(token) {
  refreshQueue.forEach(({ resolve }) => resolve(token))
  refreshQueue = []
}

function rejectQueue(err) {
  refreshQueue.forEach(({ reject }) => reject(err))
  refreshQueue = []
}

/**
 * 等待正在进行的刷新完成，返回新 token
 */
function waitForRefresh() {
  return new Promise((resolve, reject) => {
    refreshQueue.push({ resolve, reject })
  })
}

/**
 * 使用 refresh token 换取新的 token 对
 * 返回新的 access token；失败则抛出异常
 */
async function doRefresh() {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) throw new Error('no_refresh_token')

  const res = await fetch(BASE + '/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  })

  if (!res.ok) {
    // refresh token 也失效，清理并跳转登录
    clearAuth()
    throw new Error('refresh_failed')
  }

  const data = await res.json()
  if (data.code !== 0) {
    clearAuth()
    throw new Error('refresh_failed')
  }

  // 保存新 token 对
  localStorage.setItem('token', data.data.token)
  localStorage.setItem('refreshToken', data.data.refreshToken)
  if (data.data.username) localStorage.setItem('username', data.data.username)
  return data.data.token
}

/**
 * 尝试刷新 token（只有第一个调用者会真正发请求，其余排队等待）
 */
async function refreshAccessToken() {
  if (isRefreshing) {
    return waitForRefresh()
  }

  isRefreshing = true
  try {
    const newToken = await doRefresh()
    resolveQueue(newToken)
    return newToken
  } catch (err) {
    rejectQueue(err)
    throw err
  } finally {
    isRefreshing = false
  }
}

function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('username')
}

function goLogin() {
  clearAuth()
  window.location.href = '/login'
}

async function request(url, options = {}) {
  const token = localStorage.getItem('token')
  const headers = { ...options.headers }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let res = await fetch(BASE + url, { ...options, headers })

  // 401 且不是认证相关接口 → 尝试刷新 token 后重试一次
  if (
    res.status === 401 &&
    !url.startsWith('/auth/login') &&
    !url.startsWith('/auth/refresh')
  ) {
    try {
      const newToken = await refreshAccessToken()
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(BASE + url, { ...options, headers })
    } catch {
      goLogin()
      throw new Error('登录已过期')
    }

    // 刷新后仍然 401，放弃
    if (res.status === 401) {
      goLogin()
      throw new Error('登录已过期')
    }
  }

  if (!res.ok) {
    throw await createHttpError(res)
  }

  const contentType = res.headers.get('content-type') || ''
  if (
    res.headers.get('content-disposition')?.includes('attachment') ||
    contentType.includes('text/csv')
  ) {
    return res
  }

  const data = await res.json()
  if (data.code !== 0) throw new Error(data.message || '请求失败')
  return data.data
}

export const api = {
  get: url => request(url),
  post: (url, body) =>
    request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) =>
    request(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: url => request(url, { method: 'DELETE' }),
  download: async url => {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    let res = await fetch(BASE + url, { headers })

    // 401 → 尝试刷新
    if (res.status === 401) {
      try {
        const newToken = await refreshAccessToken()
        headers['Authorization'] = `Bearer ${newToken}`
        res = await fetch(BASE + url, { headers })
      } catch {
        goLogin()
        throw new Error('登录已过期')
      }

      if (res.status === 401) {
        goLogin()
        throw new Error('登录已过期')
      }
    }

    if (!res.ok) {
      throw await createHttpError(res)
    }

    const blob = await res.blob()
    const filename =
      res.headers
        .get('content-disposition')
        ?.match(/filename="?([^";]+)"?/)?.[1] || 'export'
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  }
}

async function createHttpError(res) {
  const contentType = res.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const data = await res.json().catch(() => null)
    return new Error(data?.message || `请求失败 (${res.status})`)
  }

  return new Error(`请求失败 (${res.status})`)
}

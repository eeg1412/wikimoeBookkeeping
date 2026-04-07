const BASE = '/api'

async function request(url, options = {}) {
  const token = localStorage.getItem('token')
  const headers = { ...options.headers }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(BASE + url, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    window.location.href = '/login'
    throw new Error('登录已过期')
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
    const res = await fetch(BASE + url, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      window.location.href = '/login'
      throw new Error('登录已过期')
    }

    if (!res.ok) {
      throw await createHttpError(res)
    }

    const blob = await res.blob()
    const filename =
      res.headers
        .get('content-disposition')
        ?.match(/filename="?([^";]+)"?/)?.[1] ||
      'export'
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

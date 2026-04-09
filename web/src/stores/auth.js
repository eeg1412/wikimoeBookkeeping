import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api/client.js'
import { useViewStateStore } from './viewState.js'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const refreshToken = ref(localStorage.getItem('refreshToken') || '')
  const username = ref(localStorage.getItem('username') || '')

  async function login(user, pass, rememberMe = false) {
    const data = await api.post('/auth/login', {
      username: user,
      password: pass,
      rememberMe
    })
    token.value = data.token
    refreshToken.value = data.refreshToken
    username.value = data.username
    localStorage.setItem('token', data.token)
    localStorage.setItem('refreshToken', data.refreshToken)
    localStorage.setItem('username', data.username)
  }

  function logout() {
    const viewStateStore = useViewStateStore()

    // 通知服务端废弃 refresh token（忽略失败）
    if (refreshToken.value) {
      api
        .post('/auth/logout', { refreshToken: refreshToken.value })
        .catch(() => {})
    }
    token.value = ''
    refreshToken.value = ''
    username.value = ''
    viewStateStore.clearAll()
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('username')
    window.location.href = '/login'
  }

  async function check() {
    try {
      await api.get('/auth/check')
      return true
    } catch {
      logout()
      return false
    }
  }

  return { token, refreshToken, username, login, logout, check }
})

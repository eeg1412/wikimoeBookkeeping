import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api/client.js'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const username = ref(localStorage.getItem('username') || '')

  async function login(user, pass) {
    const data = await api.post('/auth/login', {
      username: user,
      password: pass
    })
    token.value = data.token
    username.value = data.username
    localStorage.setItem('token', data.token)
    localStorage.setItem('username', data.username)
  }

  function logout() {
    token.value = ''
    username.value = ''
    localStorage.removeItem('token')
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

  return { token, username, login, logout, check }
})

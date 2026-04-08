<template>
  <div
    class="min-h-screen flex items-center justify-center bg-surface-secondary p-4"
  >
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="flex justify-center mb-3 text-primary">
          <AppIcon name="brand" :size="48" />
        </div>
        <h1 class="text-2xl font-bold text-on-surface">维基萌记账本</h1>
        <p class="text-sm text-on-surface-secondary mt-1">个人财务管理</p>
      </div>
      <form @submit.prevent="handleLogin" class="card space-y-4">
        <div>
          <label class="label">用户名</label>
          <input
            v-model="username"
            class="input"
            placeholder="请输入用户名"
            autocomplete="username"
          />
        </div>
        <div>
          <label class="label">密码</label>
          <input
            v-model="password"
            type="password"
            class="input"
            placeholder="请输入密码"
            autocomplete="current-password"
          />
        </div>
        <label class="flex items-center gap-2 select-none cursor-pointer">
          <input
            v-model="rememberMe"
            type="checkbox"
            class="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          <span class="text-sm text-on-surface-secondary">保持登录</span>
        </label>
        <button type="submit" class="btn-primary w-full" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useToastStore } from '../stores/toast.js'
import AppIcon from '../components/AppIcon.vue'

const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()
const username = ref('')
const password = ref('')
const rememberMe = ref(false)
const loading = ref(false)

async function handleLogin() {
  if (!username.value || !password.value) {
    toastStore.error('请输入用户名和密码', { title: '表单校验失败' })
    return
  }
  loading.value = true
  try {
    await authStore.login(username.value, password.value, rememberMe.value)
    router.push('/')
  } catch (e) {
    toastStore.error(e.message, { title: '登录失败' })
  } finally {
    loading.value = false
  }
}
</script>

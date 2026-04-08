<template>
  <div class="space-y-6">
    <h1 class="page-title">设置</h1>

    <!-- Theme -->
    <div class="card space-y-4">
      <h2 class="font-bold">外观</h2>
      <ThemeSelector v-model="localSettings.theme_color" label="主题色" />
      <div>
        <p class="text-sm font-medium text-on-surface-secondary mb-2">
          暗色模式
        </p>
        <div class="flex gap-2">
          <button
            v-for="m in darkModes"
            :key="m.value"
            class="btn-sm flex-1"
            :class="
              localSettings.dark_mode === m.value
                ? 'btn-primary'
                : 'btn-secondary'
            "
            @click="localSettings.dark_mode = m.value"
          >
            {{ m.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Currency & Timezone -->
    <div class="card space-y-4">
      <h2 class="font-bold">账本设置</h2>
      <div>
        <label class="label">默认币种</label>
        <select v-model="localSettings.default_currency" class="select">
          <option
            v-for="c in settingsStore.currencies"
            :key="c.code"
            :value="c.code"
          >
            {{ c.symbol }} {{ c.name }} ({{ c.code }})
          </option>
        </select>
      </div>
      <div>
        <label class="label">时区</label>
        <select v-model="localSettings.timezone" class="select">
          <option v-for="tz in timezones" :key="tz" :value="tz">
            {{ tz }}
          </option>
        </select>
      </div>
      <div>
        <label class="label">每周开始于</label>
        <select v-model="localSettings.week_start" class="select">
          <option value="0">周日</option>
          <option value="1">周一</option>
        </select>
      </div>
    </div>

    <div class="flex gap-3">
      <button class="btn-primary flex-1" :disabled="saving" @click="handleSave">
        {{ saving ? '保存中...' : '保存设置' }}
      </button>
    </div>
    <p
      v-if="msg"
      class="text-sm text-center"
      :class="msgType === 'error' ? 'text-red-500' : 'text-emerald-500'"
    >
      {{ msg }}
    </p>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, onMounted, watch } from 'vue'
import { useSettingsStore } from '../stores/settings.js'
import ThemeSelector from '../components/ThemeSelector.vue'
import { applyThemePreference } from '../utils/theme.js'

const settingsStore = useSettingsStore()

const localSettings = ref({ ...settingsStore.settings })
const saving = ref(false)
const msg = ref('')
const msgType = ref('success')

const darkModes = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' }
]

const timezones = [
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Hong_Kong',
  'Asia/Taipei',
  'Asia/Seoul',
  'Asia/Singapore',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Australia/Sydney',
  'Pacific/Auckland'
]

watch(
  () => [localSettings.value.theme_color, localSettings.value.dark_mode],
  () => {
    applyThemePreference(localSettings.value, { persist: false })
  },
  { immediate: true }
)

async function handleSave() {
  saving.value = true
  msg.value = ''
  try {
    await settingsStore.update(localSettings.value)
    localSettings.value = { ...settingsStore.settings }
    msg.value = '设置已保存'
    msgType.value = 'success'
  } catch (e) {
    msg.value = e.message
    msgType.value = 'error'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  localSettings.value = { ...settingsStore.settings }
})

onBeforeUnmount(() => {
  settingsStore.applyTheme()
})
</script>

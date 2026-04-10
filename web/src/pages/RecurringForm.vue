<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-3">
      <button class="btn-ghost btn-sm" @click="$router.back()">← 返回</button>
      <h1 class="page-title">{{ isEdit ? '编辑规则' : '新建规则' }}</h1>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-5">
      <div>
        <label class="label">规则名称</label>
        <input
          v-model="form.name"
          class="input"
          placeholder="如：房租"
          maxlength="50"
        />
      </div>

      <CategoryPicker
        v-model="form.category_id"
        :type="form.type"
        show-type
        label="选择分类"
        @update:type="form.type = $event"
      />

      <CurrencyInput
        v-model="form.amount"
        :currency="form.currency"
        @update:currency="form.currency = $event"
      />

      <div>
        <label class="label">频率</label>
        <select v-model="form.frequency" class="select">
          <option value="daily">每天</option>
          <option value="weekly">每周</option>
          <option value="monthly">每月</option>
          <option value="yearly">每年</option>
        </select>
      </div>

      <div v-if="form.frequency === 'weekly'">
        <label class="label">星期几</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="(d, i) in ['日', '一', '二', '三', '四', '五', '六']"
            :key="i"
            type="button"
            class="btn-sm flex-1"
            :class="form.day_of_week === i ? 'btn-primary' : 'btn-secondary'"
            @click="form.day_of_week = i"
          >
            {{ d }}
          </button>
        </div>
      </div>

      <div v-if="form.frequency === 'monthly'">
        <label class="label">每月几号</label>
        <input
          v-model.number="form.day_of_month"
          type="number"
          min="1"
          max="31"
          class="input"
          placeholder="1-31"
        />
      </div>

      <div
        v-if="form.frequency === 'yearly'"
        class="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <div>
          <label class="label">月份</label>
          <input
            v-model.number="form.month_of_year"
            type="number"
            min="1"
            max="12"
            class="input"
            placeholder="1-12"
          />
        </div>
        <div>
          <label class="label">日期</label>
          <input
            v-model.number="form.day_of_month"
            type="number"
            min="1"
            max="31"
            class="input"
            placeholder="1-31"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label class="label">执行时间（时）</label>
          <input
            v-model.number="form.hour"
            type="number"
            min="0"
            max="23"
            class="input"
          />
        </div>
        <div>
          <label class="label">执行时间（分）</label>
          <input
            v-model.number="form.minute"
            type="number"
            min="0"
            max="59"
            class="input"
          />
        </div>
      </div>

      <div>
        <label class="label">时区</label>
        <select v-model="form.timezone" class="select">
          <option v-for="tz in timezones" :key="tz" :value="tz">
            {{ tz }}
          </option>
        </select>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label class="label">开始日期</label>
          <DatePicker
            v-model="form.start_date"
            :week-start="Number(settingsStore.settings.week_start) || 1"
          />
        </div>
        <div>
          <label class="label">结束日期（可选）</label>
          <DatePicker
            v-model="form.end_date"
            :week-start="Number(settingsStore.settings.week_start) || 1"
            clearable
            placeholder="无结束日期"
          />
        </div>
      </div>

      <div>
        <label class="label">备注</label>
        <input
          v-model="form.note"
          class="input"
          placeholder="可选备注"
          maxlength="200"
        />
      </div>

      <button type="submit" class="btn-primary w-full" :disabled="saving">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRecurringStore } from '../stores/recurring.js'
import { useSettingsStore } from '../stores/settings.js'
import { useToastStore } from '../stores/toast.js'
import CategoryPicker from '../components/CategoryPicker.vue'
import CurrencyInput from '../components/CurrencyInput.vue'
import DatePicker from '../components/DatePicker.vue'
import { getLocalToday } from '../utils/date.js'

const route = useRoute()
const router = useRouter()
const store = useRecurringStore()
const settingsStore = useSettingsStore()
const toastStore = useToastStore()

const isEdit = computed(() => !!route.params.id)
const saving = ref(false)

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

const form = ref({
  name: '',
  type: 'expense',
  amount: null,
  currency: settingsStore.settings.default_currency,
  category_id: null,
  frequency: 'monthly',
  day_of_week: null,
  day_of_month: 1,
  month_of_year: null,
  hour: 0,
  minute: 0,
  timezone: settingsStore.settings.timezone || 'Asia/Shanghai',
  start_date: getLocalToday(),
  end_date: '',
  note: ''
})

async function loadRule() {
  if (!isEdit.value) return
  try {
    const { api } = await import('../api/client.js')
    const rules = await api.get('/recurring')
    const rule = rules.find(r => r.id === Number(route.params.id))
    if (rule) {
      form.value = {
        name: rule.name,
        type: rule.type,
        amount: rule.amount,
        currency: rule.currency,
        category_id: rule.category_id,
        frequency: rule.frequency,
        day_of_week: rule.day_of_week,
        day_of_month: rule.day_of_month,
        month_of_year: rule.month_of_year,
        hour: rule.hour,
        minute: rule.minute,
        timezone: rule.timezone,
        start_date: rule.start_date,
        end_date: rule.end_date || '',
        note: rule.note || ''
      }
    }
  } catch (e) {
    toastStore.error('加载失败: ' + e.message, { title: '规则加载失败' })
  }
}

async function handleSubmit() {
  if (!form.value.name) {
    toastStore.error('请输入规则名称', { title: '表单校验失败' })
    return
  }
  if (!form.value.category_id) {
    toastStore.error('请选择分类', { title: '表单校验失败' })
    return
  }
  if (!form.value.amount || form.value.amount <= 0) {
    toastStore.error('请输入有效金额', { title: '表单校验失败' })
    return
  }

  saving.value = true
  try {
    const data = { ...form.value }
    if (!data.end_date) data.end_date = null
    if (data.frequency !== 'weekly') data.day_of_week = null
    if (data.frequency === 'daily') {
      data.day_of_month = null
      data.month_of_year = null
    }
    if (data.frequency === 'weekly') {
      data.day_of_month = null
      data.month_of_year = null
    }
    if (data.frequency === 'monthly') {
      data.month_of_year = null
    }

    if (isEdit.value) {
      await store.update(Number(route.params.id), data)
    } else {
      await store.create(data)
    }
    router.back()
  } catch (e) {
    toastStore.error(e.message, {
      title: isEdit.value ? '规则保存失败' : '规则创建失败'
    })
  } finally {
    saving.value = false
  }
}

onMounted(loadRule)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="page-title">周期记账</h1>
      <router-link to="/recurring/new" class="btn-primary btn-sm"
        >+ 新建规则</router-link
      >
    </div>

    <div
      v-if="store.loading"
      class="text-center py-12 text-on-surface-secondary"
    >
      加载中...
    </div>
    <div
      v-else-if="!store.rules.length"
      class="text-center py-12 text-on-surface-secondary"
    >
      暂无周期规则，<router-link to="/recurring/new" class="text-primary"
        >创建一个</router-link
      >
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="rule in store.rules"
        :key="rule.id"
        class="card flex flex-wrap items-start gap-3"
      >
        <AppIcon
          :name="rule.category_icon || 'recurring'"
          :size="24"
          class="mt-0.5"
          :style="getRuleCategoryStyle(rule)"
        />
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-medium text-on-surface">{{ rule.name }}</span>
            <span
              :class="
                rule.is_active
                  ? 'badge-income'
                  : 'badge bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              "
            >
              {{ rule.is_active ? '运行中' : '已暂停' }}
            </span>
            <span
              :class="rule.type === 'income' ? 'badge-income' : 'badge-expense'"
            >
              {{ rule.type === 'income' ? '收入' : '支出' }}
            </span>
          </div>
          <div class="text-sm text-on-surface-secondary mt-0.5">
            {{ frequencyText(rule) }}
          </div>
          <div
            class="text-sm font-bold mt-1"
            :class="
              rule.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
            "
          >
            {{ settingsStore.formatMoney(rule.amount, rule.currency) }}
          </div>
        </div>
        <div class="flex w-full flex-wrap gap-1 sm:w-auto sm:justify-end">
          <button class="btn-ghost btn-sm text-xs" @click="toggleActive(rule)">
            {{ rule.is_active ? '暂停' : '启用' }}
          </button>
          <router-link
            :to="`/recurring/${rule.id}/edit`"
            class="btn-ghost btn-sm text-xs"
            >编辑</router-link
          >
          <button
            class="btn-ghost btn-sm text-xs text-red-500"
            @click="confirmDelete(rule)"
          >
            删除
          </button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :show="!!deletingRule"
      title="删除规则"
      :message="`确定要删除周期规则「${deletingRule?.name}」吗？`"
      confirm-text="删除"
      danger
      @confirm="handleDelete"
      @cancel="deletingRule = null"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRecurringStore } from '../stores/recurring.js'
import { useSettingsStore } from '../stores/settings.js'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import AppIcon from '../components/AppIcon.vue'
import { getCategoryAccentColor } from '../utils/category-ui.js'

const store = useRecurringStore()
const settingsStore = useSettingsStore()
const deletingRule = ref(null)

const FREQ_MAP = {
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
  yearly: '每年'
}
const DOW = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function getRuleCategoryStyle(rule) {
  const color = getCategoryAccentColor(rule)
  return color ? { color } : undefined
}

function frequencyText(rule) {
  let text = FREQ_MAP[rule.frequency] || rule.frequency
  if (rule.frequency === 'weekly' && rule.day_of_week != null) {
    text += DOW[rule.day_of_week]
  }
  if (rule.frequency === 'monthly' && rule.day_of_month != null) {
    text += `${rule.day_of_month}号`
  }
  if (rule.frequency === 'yearly' && rule.month_of_year != null) {
    text += `${rule.month_of_year}月${rule.day_of_month || 1}号`
  }
  text += ` ${String(rule.hour).padStart(2, '0')}:${String(rule.minute).padStart(2, '0')}`
  return text
}

async function toggleActive(rule) {
  await store.update(rule.id, { is_active: rule.is_active ? 0 : 1 })
}

function confirmDelete(rule) {
  deletingRule.value = rule
}

async function handleDelete() {
  await store.remove(deletingRule.value.id)
  deletingRule.value = null
}

onMounted(() => store.fetch())
</script>

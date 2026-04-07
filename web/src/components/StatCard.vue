<template>
  <div class="card">
    <div class="flex items-center justify-between mb-1">
      <span class="text-sm text-on-surface-secondary">{{ title }}</span>
      <AppIcon
        v-if="icon"
        :name="icon"
        :size="20"
        class="text-on-surface-secondary"
      />
    </div>
    <div class="text-xl font-bold sm:text-2xl" :class="valueClass">
      {{ displayValue }}
    </div>
    <div v-if="sub" class="text-xs text-on-surface-secondary mt-1">
      {{ sub }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  title: String,
  value: [Number, String],
  icon: String,
  type: { type: String, default: '' },
  prefix: { type: String, default: '' },
  sub: String
})

const displayValue = computed(() => {
  if (typeof props.value === 'number') {
    return (
      props.prefix +
      props.value.toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    )
  }
  return props.prefix + (props.value || '0.00')
})

const valueClass = computed(() => {
  if (props.type === 'income') return 'text-emerald-500'
  if (props.type === 'expense') return 'text-rose-500'
  return 'text-on-surface'
})
</script>

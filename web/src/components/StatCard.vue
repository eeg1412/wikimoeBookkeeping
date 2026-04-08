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
    <div :class="[valueTextClass, valueClass]">
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
  compact: Boolean,
  icon: String,
  type: { type: String, default: '' },
  prefix: { type: String, default: '' },
  sub: String
})

const displaySign = computed(() => {
  if (props.type === 'balance' && (numericValue.value || 0) > 0) {
    return '+'
  }

  return ''
})

const displayValue = computed(() => {
  if (typeof props.value === 'number') {
    return (
      displaySign.value +
      props.prefix +
      props.value.toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    )
  }
  return displaySign.value + props.prefix + (props.value || '0.00')
})

const valueTextClass = computed(() =>
  props.compact
    ? 'pt-2 text-xs font-medium leading-tight sm:text-sm'
    : 'text-xl font-bold sm:text-2xl'
)

const numericValue = computed(() => {
  if (typeof props.value === 'number') return props.value
  if (typeof props.value === 'string' && props.value.trim()) {
    const parsedValue = Number(props.value)
    return Number.isFinite(parsedValue) ? parsedValue : null
  }
  return null
})

const valueClass = computed(() => {
  if (props.type === 'income') return 'text-emerald-500'
  if (props.type === 'expense') return 'text-rose-500'
  if (props.type === 'balance') {
    if ((numericValue.value || 0) > 0) return 'text-emerald-500'
    if ((numericValue.value || 0) < 0) return 'text-rose-500'
  }
  return 'text-on-surface'
})
</script>

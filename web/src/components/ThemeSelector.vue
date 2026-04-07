<template>
  <div>
    <p class="text-sm font-medium text-on-surface-secondary mb-2">
      {{ label }}
    </p>
    <div class="flex gap-2 flex-wrap">
      <button
        v-for="t in themes"
        :key="t.value"
        class="w-8 h-8 rounded-full border-2 transition-all"
        :class="
          modelValue === t.value
            ? 'border-on-surface scale-110 ring-2 ring-primary/50'
            : 'border-transparent'
        "
        :style="{ backgroundColor: t.color }"
        :title="t.label"
        @click="$emit('update:modelValue', t.value)"
      ></button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: String,
  label: { type: String, default: '主题色' }
})
defineEmits(['update:modelValue'])

const themes = [
  { value: 'blue', label: '蓝色', color: '#3b82f6' },
  { value: 'indigo', label: '靛蓝', color: '#6366f1' },
  { value: 'purple', label: '紫色', color: '#a855f7' },
  { value: 'pink', label: '粉色', color: '#ec4899' },
  { value: 'rose', label: '玫红', color: '#f43f5e' },
  { value: 'orange', label: '橙色', color: '#f97316' },
  { value: 'amber', label: '琥珀', color: '#f59e0b' },
  { value: 'emerald', label: '翡翠', color: '#10b981' },
  { value: 'teal', label: '青色', color: '#14b8a6' },
  { value: 'cyan', label: '天蓝', color: '#06b6d4' }
]
</script>

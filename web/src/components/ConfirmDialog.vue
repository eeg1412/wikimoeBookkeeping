<template>
  <AppModal :show="show" :title="title" max-width="sm" @close="$emit('cancel')">
    <p class="text-sm text-on-surface-secondary">{{ message }}</p>

    <template #footer>
      <button class="btn-secondary btn-sm" @click="$emit('cancel')">
        取消
      </button>
      <button
        class="btn-sm"
        :class="danger ? 'btn-danger' : 'btn-primary'"
        @click="$emit('confirm')"
      >
        {{ confirmText || '确认' }}
      </button>
    </template>
  </AppModal>
</template>

<script setup>
import AppModal from './AppModal.vue'

defineProps({
  show: Boolean,
  title: { type: String, default: '确认操作' },
  message: { type: String, default: '确定要执行此操作吗？' },
  confirmText: String,
  danger: Boolean
})
defineEmits(['confirm', 'cancel'])
</script>

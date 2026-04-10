<template>
  <AppModal
    :show="show"
    :title="title"
    max-width="sm"
    :show-close="showClose"
    :close-on-overlay="closeOnOverlay"
    @close="$emit('cancel')"
  >
    <p class="text-sm text-on-surface-secondary">{{ message }}</p>

    <template #footer>
      <button
        class="btn-secondary btn-sm"
        :disabled="cancelDisabled"
        @click="$emit('cancel')"
      >
        取消
      </button>
      <button
        class="btn-sm"
        :class="danger ? 'btn-danger' : 'btn-primary'"
        :disabled="confirmDisabled"
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
  danger: Boolean,
  confirmDisabled: Boolean,
  cancelDisabled: Boolean,
  showClose: { type: Boolean, default: true },
  closeOnOverlay: { type: Boolean, default: true }
})
defineEmits(['confirm', 'cancel'])
</script>

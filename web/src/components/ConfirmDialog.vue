<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        @click.self="$emit('cancel')"
      >
        <div
          class="bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6 border border-border"
        >
          <h3 class="text-lg font-bold text-on-surface mb-2">{{ title }}</h3>
          <p class="text-sm text-on-surface-secondary mb-6">{{ message }}</p>
          <div class="flex gap-3 justify-end">
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
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({
  show: Boolean,
  title: { type: String, default: '确认操作' },
  message: { type: String, default: '确定要执行此操作吗？' },
  confirmText: String,
  danger: Boolean
})
defineEmits(['confirm', 'cancel'])
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>

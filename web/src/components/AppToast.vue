<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed inset-x-0 top-4 z-[80] flex justify-center px-4 sm:justify-end sm:px-6"
    >
      <TransitionGroup
        name="toast"
        tag="div"
        class="flex w-full max-w-sm flex-col gap-3"
      >
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          class="pointer-events-auto overflow-hidden rounded-2xl border border-border bg-surface/95 p-3 shadow-2xl backdrop-blur"
        >
          <div class="flex items-start gap-3">
            <span
              class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              :class="getIndicatorClass(toast.type)"
            ></span>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold text-on-surface">
                {{ toast.title }}
              </div>
              <p class="mt-1 text-sm leading-5 text-on-surface-secondary">
                {{ toast.message }}
              </p>
            </div>
            <button
              type="button"
              class="btn-icon !h-8 !w-8 !p-0 text-on-surface-secondary hover:bg-surface-secondary"
              @click="toastStore.remove(toast.id)"
            >
              <AppIcon name="close" :size="16" />
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToastStore } from '../stores/toast.js'
import AppIcon from './AppIcon.vue'

const toastStore = useToastStore()

function getIndicatorClass(type) {
  switch (type) {
    case 'success':
      return 'bg-emerald-500'
    case 'error':
      return 'bg-rose-500'
    default:
      return 'bg-primary'
  }
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate3d(0, -12px, 0) scale(0.98);
}

.toast-move {
  transition: transform 0.22s ease;
}
</style>

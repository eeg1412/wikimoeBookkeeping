<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 bg-black/40 p-4"
        @click.self="handleOverlayClose"
      >
        <div class="flex min-h-full items-center justify-center">
          <section
            :class="panelClasses"
            role="dialog"
            aria-modal="true"
            :aria-label="title || '弹窗'"
          >
            <header
              class="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4"
            >
              <div class="min-w-0">
                <h3 v-if="title" class="text-lg font-bold text-on-surface">
                  {{ title }}
                </h3>
                <p
                  v-if="description"
                  class="mt-1 text-sm text-on-surface-secondary"
                >
                  {{ description }}
                </p>
                <slot name="header"></slot>
              </div>
              <button
                v-if="showClose"
                type="button"
                class="btn-icon -mr-2 -mt-1 text-on-surface-secondary"
                aria-label="关闭弹窗"
                @click="$emit('close')"
              >
                <AppIcon name="close" :size="18" />
              </button>
            </header>

            <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <slot></slot>
            </div>

            <footer
              v-if="$slots.footer"
              class="flex shrink-0 items-center justify-end gap-3 border-t border-border px-5 py-4"
            >
              <slot name="footer"></slot>
            </footer>
          </section>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  show: Boolean,
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  maxWidth: { type: String, default: 'sm' },
  showClose: { type: Boolean, default: true },
  closeOnOverlay: { type: Boolean, default: true }
})

const emit = defineEmits(['close'])

const widthClassMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl'
}

const panelClasses = computed(() => [
  'flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl',
  widthClassMap[props.maxWidth] || widthClassMap.sm
])

function handleOverlayClose() {
  if (props.closeOnOverlay) {
    emit('close')
  }
}
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

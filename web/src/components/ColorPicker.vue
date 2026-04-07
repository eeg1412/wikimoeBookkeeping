<template>
  <div
    class="rounded-2xl border border-border bg-surface-secondary/40 p-4 space-y-4"
  >
    <div
      class="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3"
    >
      <div
        class="h-12 w-12 shrink-0 rounded-xl border border-white/70 shadow-sm"
        :style="{ backgroundColor: currentColor }"
      ></div>
      <p class="text-sm font-semibold text-on-surface">分类颜色</p>
    </div>

    <div class="space-y-2">
      <div
        class="flex items-center justify-between gap-3 text-xs text-on-surface-secondary"
      >
        <span>快捷色板</span>
        <button
          type="button"
          class="font-medium text-primary"
          @click="shuffleColor"
        >
          随机换一个
        </button>
      </div>
      <div class="grid grid-cols-7 gap-2 sm:grid-cols-10">
        <button
          v-for="swatch in swatches"
          :key="swatch"
          type="button"
          class="h-9 rounded-xl border transition-transform"
          :class="
            currentColor === swatch
              ? 'scale-105 border-on-surface shadow-sm'
              : 'border-border hover:scale-[1.02]'
          "
          :style="{ backgroundColor: swatch }"
          :title="swatch"
          @click="applyColor(swatch)"
        ></button>
      </div>
    </div>

    <label class="block space-y-1">
      <div
        class="flex items-center justify-between text-xs text-on-surface-secondary"
      >
        <span>色相</span>
        <span>{{ hue }}°</span>
      </div>
      <input
        v-model="hue"
        type="range"
        min="0"
        max="359"
        class="color-range"
        :style="{ background: hueTrack }"
      />
    </label>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import {
  CATEGORY_COLOR_LIMITS,
  CATEGORY_COLOR_SWATCHES,
  buildCategoryColor,
  formatCategoryColor,
  generateCategoryColor,
  parseCategoryColor
} from '@shared/category-colors.js'

const props = defineProps({
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const initialColor =
  parseCategoryColor(props.modelValue) ||
  parseCategoryColor(CATEGORY_COLOR_SWATCHES[0])

const hue = ref(initialColor.hue)
const saturation = ref(initialColor.saturation)
const lightness = ref(initialColor.lightness)

const swatches = CATEGORY_COLOR_SWATCHES

const currentColor = computed(() =>
  formatCategoryColor({
    hue: hue.value,
    saturation: saturation.value,
    lightness: lightness.value
  })
)

const hueTrack = computed(
  () =>
    `linear-gradient(90deg, ${[0, 60, 120, 180, 240, 300, 359]
      .map(value =>
        buildCategoryColor(value, saturation.value, lightness.value)
      )
      .join(', ')})`
)

watch(
  () => props.modelValue,
  value => {
    const parsed = parseCategoryColor(value)
    if (!parsed) {
      return
    }

    const normalized = formatCategoryColor(parsed)
    if (normalized === currentColor.value) {
      return
    }

    setColor(parsed)
  }
)

watch(
  currentColor,
  value => {
    if (value !== props.modelValue) {
      emit('update:modelValue', value)
    }
  },
  { immediate: true }
)

function setColor(color) {
  hue.value = color.hue
  saturation.value = color.saturation
  lightness.value = color.lightness
}

function applyColor(color) {
  const parsed = parseCategoryColor(color)
  if (parsed) {
    setColor(parsed)
  }
}

function shuffleColor() {
  applyColor(generateCategoryColor())
}
</script>

<style scoped>
.color-range {
  appearance: none;
  width: 100%;
  height: 12px;
  border: 1px solid rgb(var(--color-border));
  border-radius: 9999px;
  cursor: pointer;
}

.color-range::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  border: 2px solid white;
  box-shadow: 0 1px 6px rgb(15 23 42 / 0.28);
  background: white;
}

.color-range::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  border: 2px solid white;
  box-shadow: 0 1px 6px rgb(15 23 42 / 0.28);
  background: white;
}
</style>

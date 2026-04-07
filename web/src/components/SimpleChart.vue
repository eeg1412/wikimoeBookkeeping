<template>
  <div>
    <!-- Donut chart -->
    <div
      v-if="type === 'donut'"
      class="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6"
    >
      <div
        class="relative flex-shrink-0"
        :style="{ width: size + 'px', height: size + 'px' }"
      >
        <svg :viewBox="`0 0 ${size} ${size}`" class="transform -rotate-90">
          <circle
            v-if="!segments.length"
            :cx="center"
            :cy="center"
            :r="radius"
            fill="none"
            stroke="currentColor"
            class="text-border"
            :stroke-width="stroke"
          />
          <circle
            v-for="(seg, i) in segments"
            :key="i"
            :cx="center"
            :cy="center"
            :r="radius"
            fill="none"
            :stroke="seg.color"
            :stroke-width="stroke"
            :stroke-dasharray="`${seg.length} ${circumference - seg.length}`"
            :stroke-dashoffset="-seg.offset"
            stroke-linecap="round"
          />
        </svg>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-center">
            <div class="text-xs text-on-surface-secondary">
              {{ centerLabel }}
            </div>
            <div class="text-sm font-bold text-on-surface">
              {{ centerValue }}
            </div>
          </div>
        </div>
      </div>
      <div class="w-full flex-1 space-y-1.5 min-w-0">
        <div
          v-for="(item, i) in legendItems"
          :key="i"
          class="flex items-center gap-2 text-sm"
        >
          <span
            class="w-2.5 h-2.5 rounded-full flex-shrink-0"
            :style="{ backgroundColor: item.color }"
          ></span>
          <span class="truncate text-on-surface-secondary">{{
            item.label
          }}</span>
          <span class="ml-auto font-medium text-on-surface"
            >{{ item.percentage }}%</span
          >
        </div>
      </div>
    </div>

    <!-- Bar chart -->
    <div v-else-if="type === 'bar'" class="overflow-x-auto pb-1">
      <div :style="{ minWidth: barMinWidth + 'px' }">
        <div class="flex items-end gap-3" :style="{ height: height + 'px' }">
          <div
            v-for="(group, i) in barGroups"
            :key="i"
            class="flex h-full shrink-0 flex-col items-center justify-end gap-1"
            :style="{ width: barGroupWidth + 'px' }"
          >
            <div class="flex h-full w-full items-end justify-center gap-1.5">
              <div
                v-for="(bar, j) in group.series"
                :key="j"
                class="min-h-[2px] flex-1 rounded-t transition-all duration-300"
                :style="{
                  maxWidth: barWidth + 'px',
                  height: bar.percentage + '%',
                  backgroundColor: bar.color
                }"
                :title="`${group.label} ${bar.label}: ${bar.value}`"
              ></div>
            </div>
          </div>
        </div>
        <div class="mt-3 flex items-start gap-3">
          <div
            v-for="(group, i) in barGroups"
            :key="i"
            class="shrink-0"
            :style="{ width: barGroupWidth + 'px' }"
          >
            <div :style="{ height: barLabelHeight + 'px' }">
              <span
                class="block whitespace-nowrap text-[10px] font-medium text-on-surface"
                :class="
                  shouldTiltBarLabels
                    ? 'origin-top-left rotate-45 translate-x-2 text-left'
                    : 'truncate text-center'
                "
              >
                {{ group.label }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: { type: String, default: 'donut' },
  data: { type: Array, default: () => [] },
  size: { type: Number, default: 140 },
  height: { type: Number, default: 160 },
  stroke: { type: Number, default: 24 },
  centerLabel: String,
  centerValue: String,
  colors: {
    type: Array,
    default: () => [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#ec4899',
      '#06b6d4',
      '#f97316',
      '#14b8a6',
      '#6366f1',
      '#84cc16',
      '#e11d48'
    ]
  }
})

const center = computed(() => props.size / 2)
const radius = computed(() => (props.size - props.stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const segmentGap = computed(() => {
  if (props.data.length <= 1) {
    return 0
  }

  return Math.min(Math.max(props.stroke * 0.28, 3), 7)
})

const segments = computed(() => {
  const total = props.data.reduce((s, d) => s + (d.value || 0), 0)
  if (!total) return []
  let offset = 0
  return props.data.map((d, i) => {
    const pct = d.value / total
    const rawLength = pct * circumference.value
    const length = Math.max(rawLength - segmentGap.value, 0)
    const seg = {
      length,
      offset,
      color: d.color || props.colors[i % props.colors.length]
    }
    offset += rawLength
    return seg
  })
})

const legendItems = computed(() =>
  props.data.map((d, i) => ({
    label: d.label,
    percentage:
      d.percentage ??
      (
        (d.value /
          Math.max(
            props.data.reduce((s, x) => s + x.value, 0),
            1
          )) *
        100
      ).toFixed(1),
    color: d.color || props.colors[i % props.colors.length]
  }))
)

const barGroups = computed(() => {
  const values = props.data.flatMap(item => {
    if (Array.isArray(item.series) && item.series.length > 0) {
      return item.series.map(series => Math.abs(Number(series.value) || 0))
    }

    return [Math.abs(Number(item.value) || 0)]
  })
  const max = Math.max(...values, 1)

  return props.data.map((d, i) => ({
    label: d.label,
    series:
      Array.isArray(d.series) && d.series.length > 0
        ? d.series.map((series, j) => ({
            label: series.label || `系列 ${j + 1}`,
            value: Number(series.value) || 0,
            percentage: (Math.abs(Number(series.value) || 0) / max) * 100,
            color: series.color || props.colors[(i + j) % props.colors.length]
          }))
        : [
            {
              label: d.label,
              value: Number(d.value) || 0,
              percentage: (Math.abs(Number(d.value) || 0) / max) * 100,
              color: d.color || props.colors[i % props.colors.length]
            }
          ]
  }))
})

const shouldTiltBarLabels = computed(
  () =>
    barGroups.value.length > 1 &&
    barGroups.value.some(group => String(group.label || '').length > 4)
)

const barLabelHeight = computed(() => (shouldTiltBarLabels.value ? 52 : 20))

const barGroupWidth = computed(() => 44)

const barWidth = computed(() =>
  barGroups.value.some(group => group.series.length > 1) ? 14 : 20
)

const barMinWidth = computed(() => Math.max(barGroups.value.length * 56, 240))
</script>

<template>
  <div>
    <div
      v-if="type === 'donut'"
      class="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6"
    >
      <div
        ref="chartRef"
        class="relative flex-shrink-0"
        :style="{ width: size + 'px', height: size + 'px' }"
      ></div>
      <div v-if="showLegend" class="w-full flex-1 space-y-1.5 min-w-0">
        <div
          v-for="(item, i) in legendItems"
          :key="i"
          class="rounded-lg border border-border/60 bg-surface-secondary/40 p-2"
        >
          <div class="flex items-start gap-2 text-sm">
            <span
              class="mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0"
              :style="{ backgroundColor: item.color }"
            ></span>
            <div class="min-w-0 flex-1">
              <div class="flex items-start gap-3">
                <span class="truncate font-medium text-on-surface">{{
                  item.label
                }}</span>
                <div class="ml-auto shrink-0 text-right">
                  <div class="font-semibold text-on-surface">
                    {{ item.percentage }}%
                  </div>
                  <div class="text-xs text-on-surface-secondary">
                    {{ item.valueText }}
                  </div>
                </div>
              </div>
              <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-border/60">
                <div
                  class="h-full rounded-full transition-[width] duration-300"
                  :style="{
                    width: item.percentageValue + '%',
                    backgroundColor: item.color
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else-if="type === 'bar'"
      ref="barScrollRef"
      class="custom-scroll scroll-not-hide overflow-x-auto"
    >
      <div class="mx-auto" :style="{ width: resolvedBarChartWidth + 'px' }">
        <div
          ref="chartRef"
          :style="{ width: '100%', height: height + 'px' }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import {
  GraphicComponent,
  GridComponent,
  TooltipComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart,
  PieChart,
  GraphicComponent,
  GridComponent,
  TooltipComponent,
  CanvasRenderer
])

const props = defineProps({
  type: { type: String, default: 'donut' },
  data: { type: Array, default: () => [] },
  size: { type: Number, default: 200 },
  height: { type: Number, default: 220 },
  stroke: { type: Number, default: 24 },
  centerLabel: String,
  centerValue: String,
  valueFormatter: Function,
  showLegend: { type: Boolean, default: true },
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

const chartRef = ref(null)
const barScrollRef = ref(null)
const barContainerWidth = ref(0)
const themeVersion = ref(0)

let chartInstance = null
let resizeObserver = null
let themeObserver = null

const normalizedDonutData = computed(() =>
  props.data.map((item, index) => ({
    label: item.label || `项目 ${index + 1}`,
    value: Math.max(Number(item.value) || 0, 0),
    percentage: item.percentage,
    color: item.color || props.colors[index % props.colors.length]
  }))
)

const donutTotal = computed(() =>
  normalizedDonutData.value.reduce((sum, item) => sum + item.value, 0)
)

const hasDonutData = computed(() => donutTotal.value > 0)

const hasMultipleDonutSegments = computed(
  () => normalizedDonutData.value.filter(item => item.value > 0).length > 1
)

const legendItems = computed(() =>
  normalizedDonutData.value.map(item => {
    const rawPercentage = Number(
      item.percentage ?? (item.value / Math.max(donutTotal.value, 1)) * 100
    )

    return {
      label: item.label,
      percentage: rawPercentage.toFixed(1),
      percentageValue: clampPercentage(rawPercentage),
      valueText: formatValue(item.value),
      color: item.color
    }
  })
)

const normalizedBarGroups = computed(() =>
  props.data.map((item, index) => ({
    label: item.label || `项目 ${index + 1}`,
    value: Math.abs(Number(item.value) || 0),
    color: item.color || props.colors[index % props.colors.length],
    series:
      Array.isArray(item.series) && item.series.length > 0
        ? item.series.map((series, seriesIndex) => ({
            label: series.label || `系列 ${seriesIndex + 1}`,
            value: Math.abs(Number(series.value) || 0),
            color:
              series.color || props.colors[seriesIndex % props.colors.length]
          }))
        : null
  }))
)

const barCategories = computed(() =>
  normalizedBarGroups.value.map(group => group.label)
)

const barSeries = computed(() => {
  if (!normalizedBarGroups.value.length) {
    return []
  }

  const hasGroupedSeries = normalizedBarGroups.value.some(
    group => Array.isArray(group.series) && group.series.length > 0
  )

  if (!hasGroupedSeries) {
    return [
      {
        name: props.centerLabel || '数值',
        type: 'bar',
        barWidth: 12,
        barMaxWidth: 12,
        barCategoryGap: '8%',
        data: normalizedBarGroups.value.map(group => ({
          value: group.value,
          itemStyle: {
            color: group.color,
            borderRadius: [8, 8, 0, 0]
          }
        }))
      }
    ]
  }

  const seriesMeta = []
  const seriesMetaIndexMap = new Map()

  normalizedBarGroups.value.forEach(group => {
    ;(group.series || []).forEach((series, seriesIndex) => {
      const name = series.label || `系列 ${seriesIndex + 1}`

      if (seriesMetaIndexMap.has(name)) {
        return
      }

      seriesMetaIndexMap.set(name, seriesMeta.length)
      seriesMeta.push({
        name,
        color:
          series.color || props.colors[seriesMeta.length % props.colors.length]
      })
    })
  })

  return seriesMeta.map(meta => ({
    name: meta.name,
    type: 'bar',
    barWidth: 8,
    barMaxWidth: 8,
    barGap: '5%',
    barCategoryGap: '10%',
    itemStyle: {
      color: meta.color,
      borderRadius: [8, 8, 0, 0]
    },
    data: normalizedBarGroups.value.map(group => {
      const matchedSeries = (group.series || []).find(
        series => series.label === meta.name
      )
      return matchedSeries ? matchedSeries.value : 0
    })
  }))
})

const maxBarLabelLength = computed(() =>
  barCategories.value.reduce(
    (max, label) => Math.max(max, String(label || '').length),
    0
  )
)

const barDataWidth = computed(() =>
  Math.max(
    barCategories.value.length *
      Math.max(
        barSeries.value.length > 1 ? 28 : 24,
        maxBarLabelLength.value * 10
      ),
    240
  )
)

const resolvedBarChartWidth = computed(() =>
  Math.max(barDataWidth.value, barContainerWidth.value || 0)
)

const chartTheme = computed(() => {
  themeVersion.value

  return getThemePalette()
})

const donutOptions = computed(() => {
  const theme = chartTheme.value

  return {
    animationDuration: 300,
    animationDurationUpdate: 0,
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      transitionDuration: 0,
      appendToBody: true,
      enterable: false,
      extraCssText: 'pointer-events:none;',
      formatter(params) {
        if (!hasDonutData.value) {
          return '暂无数据'
        }

        return [
          `${params.marker}<span style="font-weight:600">${escapeHtml(params.name)}</span>`,
          `金额：${formatValue(normalizeTooltipValue(params.value))}`,
          `占比：${Number(params.percent || 0).toFixed(1)}%`
        ].join('<br/>')
      }
    },
    graphic: [
      {
        type: 'group',
        left: 'center',
        top: 'center',
        silent: true,
        bounding: 'raw',
        children: [
          {
            type: 'text',
            top: -14,
            style: {
              text: props.centerLabel || '',
              fill: theme.secondaryTextColor,
              fontSize: 12,
              fontWeight: 500,
              textAlign: 'center'
            }
          },
          {
            type: 'text',
            top: 6,
            style: {
              text: props.centerValue || '',
              fill: theme.textColor,
              fontSize: 14,
              fontWeight: 700,
              textAlign: 'center'
            }
          }
        ]
      }
    ],
    series: [
      {
        type: 'pie',
        radius: ['62%', '84%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        padAngle: hasMultipleDonutSegments.value ? 2 : 0,
        selectedMode: false,
        selectedOffset: 0,
        stillShowZeroSum: false,
        itemStyle: {
          borderColor: theme.surfaceColor,
          borderWidth: hasMultipleDonutSegments.value ? 1 : 0,
          borderRadius: 0
        },
        label: { show: false },
        labelLine: { show: false },
        emphasis: { disabled: true },
        data: hasDonutData.value
          ? normalizedDonutData.value.map(item => ({
              name: item.label,
              value: item.value,
              itemStyle: { color: item.color }
            }))
          : [
              {
                name: '暂无数据',
                value: 1,
                itemStyle: { color: theme.trackColor },
                tooltip: { show: false }
              }
            ]
      }
    ]
  }
})

const barOptions = computed(() => {
  const theme = chartTheme.value

  return {
    animationDuration: 350,
    grid: {
      top: 12,
      right: 12,
      bottom: 8,
      left: 12,
      outerBoundsMode: 'same',
      outerBoundsContain: 'axisLabel'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: theme.shadowColor
        }
      },
      formatter(params) {
        const entries = Array.isArray(params) ? params : [params]
        const title = escapeHtml(entries[0]?.axisValueLabel || '')

        return [
          title,
          ...entries.map(
            entry =>
              `${entry.marker}${escapeHtml(entry.seriesName)}：${formatValue(normalizeTooltipValue(entry.value))}`
          )
        ].join('<br/>')
      }
    },
    xAxis: {
      type: 'category',
      data: barCategories.value,
      axisTick: { show: false },
      axisLine: {
        lineStyle: {
          color: theme.borderColor
        }
      },
      axisLabel: {
        color: theme.textColor,
        fontSize: 11,
        interval: 0,
        margin: 6,
        rotate: 0,
        hideOverlap: false
      }
    },
    yAxis: {
      type: 'value',
      splitNumber: 4,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: theme.secondaryTextColor,
        fontSize: 11,
        formatter(value) {
          return formatValue(value)
        }
      },
      splitLine: {
        lineStyle: {
          color: theme.gridLineColor
        }
      }
    },
    series: barSeries.value
  }
})

const chartOptions = computed(() =>
  props.type === 'bar' ? barOptions.value : donutOptions.value
)

function formatValue(value) {
  const numericValue = Number(value) || 0

  if (typeof props.valueFormatter === 'function') {
    return props.valueFormatter(numericValue)
  }

  return numericValue.toLocaleString('zh-CN', {
    minimumFractionDigits: Number.isInteger(numericValue) ? 0 : 2,
    maximumFractionDigits: 2
  })
}

function normalizeTooltipValue(value) {
  if (Array.isArray(value)) {
    return Number(value[value.length - 1]) || 0
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return Number(value.value) || 0
  }

  return Number(value) || 0
}

function clampPercentage(value) {
  return Math.min(Math.max(Number(value) || 0, 0), 100)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getThemePalette() {
  if (typeof window === 'undefined') {
    return {
      textColor: '#111827',
      secondaryTextColor: '#6b7280',
      borderColor: '#e5e7eb',
      gridLineColor: '#f3f4f6',
      surfaceColor: '#ffffff',
      trackColor: '#f3f4f6',
      shadowColor: 'rgba(107, 114, 128, 0.08)'
    }
  }

  const styles = getComputedStyle(document.documentElement)

  return {
    textColor: resolveCssColor(
      styles.getPropertyValue('--color-on-surface'),
      '#111827'
    ),
    secondaryTextColor: resolveCssColor(
      styles.getPropertyValue('--color-on-surface-secondary'),
      '#6b7280'
    ),
    borderColor: resolveCssColor(
      styles.getPropertyValue('--color-border'),
      '#e5e7eb'
    ),
    gridLineColor: resolveCssColor(
      styles.getPropertyValue('--color-border'),
      '#e5e7eb'
    ),
    surfaceColor: resolveCssColor(
      styles.getPropertyValue('--color-surface'),
      '#ffffff'
    ),
    trackColor: resolveCssColor(
      styles.getPropertyValue('--color-surface-secondary'),
      '#f3f4f6'
    ),
    shadowColor: 'rgba(107, 114, 128, 0.08)'
  }
}

function resolveCssColor(rawValue, fallback) {
  const value = String(rawValue || '').trim()

  if (!value) {
    return fallback
  }

  if (/^\d+\s+\d+\s+\d+$/.test(value)) {
    return `rgb(${value})`
  }

  return value
}

function ensureChart() {
  if (!chartRef.value) {
    return null
  }

  if (chartInstance && chartInstance.getDom() !== chartRef.value) {
    chartInstance.dispose()
    chartInstance = null
  }

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  return chartInstance
}

function updateBarContainerWidth() {
  barContainerWidth.value = Math.round(barScrollRef.value?.clientWidth || 0)
}

function syncResizeObserver() {
  if (!resizeObserver) {
    return
  }

  resizeObserver.disconnect()

  if (chartRef.value) {
    resizeObserver.observe(chartRef.value)
  }

  if (barScrollRef.value) {
    resizeObserver.observe(barScrollRef.value)
  }
}

async function renderChart() {
  await nextTick()

  const chart = ensureChart()
  if (!chart) {
    return
  }

  chart.setOption(chartOptions.value, { notMerge: true, lazyUpdate: true })
  syncResizeObserver()
  chart.resize()
}

function handleResize() {
  updateBarContainerWidth()
  chartInstance?.resize()
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateBarContainerWidth()
        chartInstance?.resize()
      })
    }

    if (typeof MutationObserver !== 'undefined') {
      themeObserver = new MutationObserver(() => {
        themeVersion.value += 1
      })

      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme']
      })
    }

    window.addEventListener('resize', handleResize)
    updateBarContainerWidth()
  }
})

watch(
  chartOptions,
  () => {
    renderChart()
  },
  { immediate: true }
)

watch(
  () => props.type,
  () => {
    renderChart()
  }
)

watch(resolvedBarChartWidth, async () => {
  await nextTick()
  chartInstance?.resize()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  themeObserver?.disconnect()

  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize)
  }

  chartInstance?.dispose()
  chartInstance = null
})
</script>

<template>
  <div :class="rootClasses" ref="rootEl">
    <button :class="navButtonClasses" @click="navigate(-1)" :title="prevTitle">
      ◀
    </button>
    <button :class="labelButtonClasses" @click="togglePanel">
      <span :class="labelTextClasses">{{ displayLabel }}</span>
    </button>
    <button :class="navButtonClasses" @click="navigate(1)" :title="nextTitle">
      ▶
    </button>

    <!-- Picker Panel -->
    <div v-if="panelOpen" :class="panelClasses">
      <!-- Day / Week mode: calendar -->
      <template v-if="period === 'day' || period === 'week'">
        <div class="flex items-center justify-between mb-2">
          <button
            type="button"
            class="btn-sm btn-secondary px-2"
            @click="calNavMonth(-1)"
          >
            ◀
          </button>
          <button
            type="button"
            class="btn-sm btn-ghost text-sm font-bold"
            @click="switchToMonthPanel"
          >
            {{ calViewYear }}年{{ calViewMonth + 1 }}月
          </button>
          <button
            type="button"
            class="btn-sm btn-secondary px-2"
            @click="calNavMonth(1)"
          >
            ▶
          </button>
        </div>
        <div
          class="grid grid-cols-7 text-center text-xs text-on-surface-secondary mb-1"
        >
          <span v-for="wd in weekdayLabels" :key="wd">{{ wd }}</span>
        </div>
        <div class="grid grid-cols-7 text-center text-sm gap-y-0.5">
          <button
            v-for="(cell, i) in calendarCells"
            :key="i"
            class="rounded-md py-1 transition-colors"
            :class="calendarCellClass(cell)"
            @click="selectCalendarCell(cell)"
            @mouseenter="onCellHover(cell)"
            @mouseleave="onCellLeave"
          >
            {{ cell.day }}
          </button>
        </div>
      </template>

      <!-- Month mode -->
      <template v-if="period === 'month' && !monthPanelShowingYears">
        <div class="flex items-center justify-between mb-2">
          <button
            type="button"
            class="btn-sm btn-secondary px-2"
            @click="prevMonthViewYear"
          >
            ◀
          </button>
          <button
            type="button"
            class="btn-sm btn-ghost text-sm font-bold"
            @click="showMonthYearPanel"
          >
            {{ monthViewYear }}年
          </button>
          <button
            type="button"
            class="btn-sm btn-secondary px-2"
            @click="nextMonthViewYear"
          >
            ▶
          </button>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="m in 12"
            :key="m"
            class="btn-sm rounded-lg py-2 transition-colors"
            :class="monthCellClass(m)"
            @click="selectMonth(m)"
          >
            {{ m }}月
          </button>
        </div>
      </template>

      <!-- Year mode or month-panel year drill -->
      <template
        v-if="
          period === 'year' || (period === 'month' && monthPanelShowingYears)
        "
      >
        <div class="flex items-center justify-between mb-2">
          <button
            type="button"
            class="btn-sm btn-secondary px-2"
            @click="prevYearRange"
          >
            ◀
          </button>
          <span class="text-sm font-bold"
            >{{ yearRangeStart }} – {{ yearRangeStart + 11 }}</span
          >
          <button
            type="button"
            class="btn-sm btn-secondary px-2"
            @click="nextYearRange"
          >
            ▶
          </button>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="y in yearGridItems"
            :key="y"
            class="btn-sm rounded-lg py-2 transition-colors"
            :class="yearCellClass(y)"
            @click="selectYear(y)"
          >
            {{ y }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: String, required: true },
  period: {
    type: String,
    required: true,
    validator: v => ['day', 'week', 'month', 'year'].includes(v)
  },
  weekStart: { type: Number, default: 1 },
  mobileFullWidth: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const rootEl = ref(null)
const panelOpen = ref(false)
const hoverDate = ref(null)

// Calendar view state (day/week modes)
const calViewYear = ref(2026)
const calViewMonth = ref(0) // 0-based

// Month mode view state
const monthViewYear = ref(2026)
const monthPanelShowingYears = ref(false)

// Year mode view state
const yearRangeStart = ref(2020)

// Parse current value
function parseDateStr(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fmtDateCN(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

// Week helpers
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day - props.weekStart + 7) % 7
  d.setDate(d.getDate() - diff)
  return d
}

function getWeekEnd(date) {
  const s = getWeekStart(date)
  const e = new Date(s)
  e.setDate(e.getDate() + 6)
  return e
}

// Display label
const displayLabel = computed(() => {
  const d = parseDateStr(props.modelValue)
  switch (props.period) {
    case 'day':
      return fmtDateCN(d)
    case 'week': {
      const s = getWeekStart(d)
      const e = getWeekEnd(d)
      return `${fmtDate(s)} ~ ${fmtDate(e)}`
    }
    case 'month':
      return `${d.getFullYear()}年${d.getMonth() + 1}月`
    case 'year':
      return `${d.getFullYear()}年`
    default:
      return props.modelValue
  }
})

const prevTitle = computed(() => {
  const map = { day: '上一天', week: '上一周', month: '上一月', year: '上一年' }
  return map[props.period] || '上一个'
})

const nextTitle = computed(() => {
  const map = { day: '下一天', week: '下一周', month: '下一月', year: '下一年' }
  return map[props.period] || '下一个'
})

const rootClasses = computed(() => {
  if (props.mobileFullWidth) {
    return 'relative grid w-full grid-cols-[2.5rem,minmax(0,1fr),2.5rem] items-center gap-1 sm:inline-flex sm:w-auto sm:grid-cols-none'
  }
  return 'relative flex items-center gap-1'
})

const navButtonClasses = computed(() => {
  if (props.mobileFullWidth) {
    return 'btn-sm btn-secondary min-w-[2.5rem] px-0 sm:px-2'
  }
  return 'btn-sm btn-secondary px-2'
})

const labelButtonClasses = computed(() => {
  if (props.mobileFullWidth) {
    return 'btn-sm btn-secondary min-w-0 overflow-hidden px-2 text-center font-medium whitespace-nowrap sm:min-w-[7rem] sm:px-1'
  }
  return 'btn-sm btn-secondary px-1 min-w-[7rem] text-center font-medium whitespace-nowrap'
})

const labelTextClasses = computed(() => {
  return props.mobileFullWidth ? 'block truncate' : ''
})

const panelClasses = computed(() => {
  if (props.mobileFullWidth) {
    return 'absolute top-full left-0 z-50 mt-1 w-full min-w-0 rounded-xl border border-border bg-surface p-3 shadow-lg sm:w-auto sm:min-w-[280px]'
  }
  return 'absolute top-full left-0 mt-1 z-50 bg-surface border border-border rounded-xl shadow-lg p-3 min-w-[280px]'
})

// Navigate
function navigate(direction) {
  const d = parseDateStr(props.modelValue)
  switch (props.period) {
    case 'day':
      d.setDate(d.getDate() + direction)
      break
    case 'week':
      d.setDate(d.getDate() + direction * 7)
      break
    case 'month':
      d.setMonth(d.getMonth() + direction)
      break
    case 'year':
      d.setFullYear(d.getFullYear() + direction)
      break
  }
  emit('update:modelValue', fmtDate(d))
}

// Toggle panel
function togglePanel() {
  panelOpen.value = !panelOpen.value
  if (panelOpen.value) syncPanelState()
}

function syncPanelState() {
  const d = parseDateStr(props.modelValue)
  calViewYear.value = d.getFullYear()
  calViewMonth.value = d.getMonth()
  monthViewYear.value = d.getFullYear()
  monthPanelShowingYears.value = false
  yearRangeStart.value = d.getFullYear() - (d.getFullYear() % 12)
}

// Click outside
function handleClickOutside(e) {
  if (rootEl.value && !rootEl.value.contains(e.target)) {
    panelOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onBeforeUnmount(() =>
  document.removeEventListener('mousedown', handleClickOutside)
)

// Watch period change → close panel
watch(
  () => props.period,
  () => {
    panelOpen.value = false
  }
)

// =========================================
// Calendar (day/week modes)
// =========================================
const weekdayLabels = computed(() => {
  const full = ['日', '一', '二', '三', '四', '五', '六']
  const labels = []
  for (let i = 0; i < 7; i++) labels.push(full[(props.weekStart + i) % 7])
  return labels
})

function onCellHover(cell) {
  hoverDate.value = cell.date
}

function onCellLeave() {
  hoverDate.value = null
}

function prevMonthViewYear() {
  monthViewYear.value--
}

function nextMonthViewYear() {
  monthViewYear.value++
}

function showMonthYearPanel() {
  monthPanelShowingYears.value = true
}

function prevYearRange() {
  yearRangeStart.value -= 12
}

function nextYearRange() {
  yearRangeStart.value += 12
}

function calNavMonth(dir) {
  let m = calViewMonth.value + dir
  let y = calViewYear.value
  if (m < 0) {
    m = 11
    y--
  }
  if (m > 11) {
    m = 0
    y++
  }
  calViewMonth.value = m
  calViewYear.value = y
}

function switchToMonthPanel() {
  // Switch to a mini month selector within day/week mode
  panelOpen.value = false
  // For simplicity, we'll just keep the month navigation arrows
}

const calendarCells = computed(() => {
  const cells = []
  const firstDay = new Date(calViewYear.value, calViewMonth.value, 1)
  const lastDay = new Date(calViewYear.value, calViewMonth.value + 1, 0)
  const firstDayOfWeek = firstDay.getDay()
  const offset = (firstDayOfWeek - props.weekStart + 7) % 7

  // Previous month fill
  const prevLast = new Date(calViewYear.value, calViewMonth.value, 0)
  for (let i = offset - 1; i >= 0; i--) {
    const d = new Date(prevLast)
    d.setDate(prevLast.getDate() - i)
    cells.push({ day: d.getDate(), date: fmtDate(d), currentMonth: false })
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(calViewYear.value, calViewMonth.value, d)
    cells.push({ day: d, date: fmtDate(date), currentMonth: true })
  }

  // Next month fill
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(calViewYear.value, calViewMonth.value + 1, d)
    cells.push({ day: d, date: fmtDate(date), currentMonth: false })
  }

  return cells
})

function calendarCellClass(cell) {
  const classes = []
  const selected = props.modelValue

  if (!cell.currentMonth) {
    classes.push('text-on-surface-secondary/40')
  }

  if (props.period === 'day') {
    if (cell.date === selected) {
      classes.push('bg-primary text-white font-bold')
    } else {
      classes.push('hover:bg-surface-secondary cursor-pointer')
    }
  } else if (props.period === 'week') {
    const ws = fmtDate(getWeekStart(parseDateStr(cell.date)))
    const selectedWs = fmtDate(getWeekStart(parseDateStr(selected)))
    const hoverWs = hoverDate.value
      ? fmtDate(getWeekStart(parseDateStr(hoverDate.value)))
      : null

    if (ws === selectedWs) {
      classes.push('bg-primary/20 text-primary font-bold')
    } else if (hoverWs && ws === hoverWs) {
      classes.push('bg-surface-secondary')
    }
    classes.push('cursor-pointer')
  }

  return classes.join(' ')
}

function selectCalendarCell(cell) {
  if (props.period === 'week') {
    // Select the week-start date
    const ws = getWeekStart(parseDateStr(cell.date))
    emit('update:modelValue', fmtDate(ws))
  } else {
    emit('update:modelValue', cell.date)
  }
  panelOpen.value = false
}

// =========================================
// Month mode
// =========================================
function monthCellClass(m) {
  const d = parseDateStr(props.modelValue)
  const isCurrent =
    d.getFullYear() === monthViewYear.value && d.getMonth() + 1 === m
  if (isCurrent) return 'bg-primary text-white font-bold'
  return 'btn-secondary hover:bg-surface-secondary cursor-pointer'
}

function selectMonth(m) {
  const d = parseDateStr(props.modelValue)
  d.setFullYear(monthViewYear.value)
  d.setMonth(m - 1)
  d.setDate(1)
  emit('update:modelValue', fmtDate(d))
  panelOpen.value = false
}

// =========================================
// Year mode
// =========================================
const yearGridItems = computed(() => {
  const items = []
  for (let i = 0; i < 12; i++) items.push(yearRangeStart.value + i)
  return items
})

function yearCellClass(y) {
  const d = parseDateStr(props.modelValue)
  if (d.getFullYear() === y) return 'bg-primary text-white font-bold'
  return 'btn-secondary hover:bg-surface-secondary cursor-pointer'
}

function selectYear(y) {
  if (props.period === 'month' && monthPanelShowingYears.value) {
    monthViewYear.value = y
    monthPanelShowingYears.value = false
    return
  }
  const d = parseDateStr(props.modelValue)
  d.setFullYear(y)
  emit('update:modelValue', fmtDate(d))
  panelOpen.value = false
}
</script>

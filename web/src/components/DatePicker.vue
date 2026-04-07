<template>
  <div class="relative" :class="inputClass" ref="rootEl">
    <button
      type="button"
      class="input w-full text-left flex items-center gap-2"
      :class="{ 'text-on-surface-secondary/60': !modelValue }"
      @click="togglePanel"
    >
      <span class="flex-1 truncate">{{ displayValue || placeholder }}</span>
      <svg
        class="w-4 h-4 shrink-0 text-on-surface-secondary"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fill-rule="evenodd"
          d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z"
          clip-rule="evenodd"
        />
      </svg>
    </button>

    <div
      v-if="panelOpen"
      class="absolute top-full mt-1 z-50 bg-surface border border-border rounded-xl shadow-lg p-3 min-w-[280px]"
      :class="alignRight ? 'right-0' : 'left-0'"
    >
      <div class="flex items-center justify-between mb-2">
        <button
          type="button"
          class="btn-sm btn-secondary px-2"
          @click="navMonth(-1)"
        >
          ◀
        </button>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="btn-sm btn-ghost text-sm font-bold"
            @click="openYearMonth"
            v-if="!showYearMonth"
          >
            {{ viewYear }}年{{ viewMonth + 1 }}月
          </button>
          <template v-if="showYearMonth">
            <select
              :value="viewYear"
              class="select text-sm py-1 px-2 w-20"
              @change="onChangeYear"
            >
              <option v-for="y in yearOptions" :key="y" :value="y">
                {{ y }}
              </option>
            </select>
            <select
              :value="viewMonth"
              class="select text-sm py-1 px-2 w-16"
              @change="onChangeMonth"
            >
              <option v-for="m in 12" :key="m - 1" :value="m - 1">
                {{ m }}月
              </option>
            </select>
          </template>
        </div>
        <button
          type="button"
          class="btn-sm btn-secondary px-2"
          @click="navMonth(1)"
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
          type="button"
          class="rounded-md py-1 transition-colors"
          :class="cellClass(cell)"
          @click="selectDate(cell)"
        >
          {{ cell.day }}
        </button>
      </div>

      <div v-if="clearable && modelValue" class="mt-2 text-center">
        <button
          type="button"
          class="btn-sm btn-ghost text-xs"
          @click="clearDate"
        >
          清除日期
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '选择日期' },
  weekStart: { type: Number, default: 1 },
  clearable: { type: Boolean, default: false },
  alignRight: { type: Boolean, default: false },
  inputClass: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'change'])

const rootEl = ref(null)
const panelOpen = ref(false)
const showYearMonth = ref(false)
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())

const displayValue = computed(() => {
  if (!props.modelValue) return ''
  const [y, m, d] = props.modelValue.split('-').map(Number)
  return `${y}年${m}月${d}日`
})

const yearOptions = computed(() => {
  const arr = []
  const center = viewYear.value
  for (let y = center - 10; y <= center + 10; y++) arr.push(y)
  return arr
})

const weekdayLabels = computed(() => {
  const full = ['日', '一', '二', '三', '四', '五', '六']
  const labels = []
  for (let i = 0; i < 7; i++) labels.push(full[(props.weekStart + i) % 7])
  return labels
})

const calendarCells = computed(() => {
  const cells = []
  const firstDay = new Date(viewYear.value, viewMonth.value, 1)
  const lastDay = new Date(viewYear.value, viewMonth.value + 1, 0)
  const firstDayOfWeek = firstDay.getDay()
  const offset = (firstDayOfWeek - props.weekStart + 7) % 7

  // Previous month fill
  const prevLast = new Date(viewYear.value, viewMonth.value, 0)
  for (let i = offset - 1; i >= 0; i--) {
    const d = new Date(prevLast)
    d.setDate(prevLast.getDate() - i)
    cells.push({ day: d.getDate(), date: fmtDate(d), currentMonth: false })
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(viewYear.value, viewMonth.value, d)
    cells.push({ day: d, date: fmtDate(date), currentMonth: true })
  }

  // Fill to 42
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(viewYear.value, viewMonth.value + 1, d)
    cells.push({ day: d, date: fmtDate(date), currentMonth: false })
  }

  return cells
})

function fmtDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function togglePanel() {
  panelOpen.value = !panelOpen.value
  if (panelOpen.value) {
    showYearMonth.value = false
    if (props.modelValue) {
      const [y, m] = props.modelValue.split('-').map(Number)
      viewYear.value = y
      viewMonth.value = m - 1
    } else {
      viewYear.value = new Date().getFullYear()
      viewMonth.value = new Date().getMonth()
    }
  }
}

function onChangeYear(e) {
  viewYear.value = Number(e.target.value)
}

function onChangeMonth(e) {
  viewMonth.value = Number(e.target.value)
  showYearMonth.value = false
}

function openYearMonth() {
  showYearMonth.value = true
}

function navMonth(dir) {
  let m = viewMonth.value + dir
  let y = viewYear.value
  if (m < 0) {
    m = 11
    y--
  }
  if (m > 11) {
    m = 0
    y++
  }
  viewMonth.value = m
  viewYear.value = y
}

function cellClass(cell) {
  const classes = []
  if (!cell.currentMonth) classes.push('text-on-surface-secondary/40')
  if (cell.date === props.modelValue) {
    classes.push('bg-primary text-white font-bold')
  } else {
    classes.push('hover:bg-surface-secondary cursor-pointer')
  }
  return classes.join(' ')
}

function selectDate(cell) {
  emit('update:modelValue', cell.date)
  emit('change', cell.date)
  panelOpen.value = false
}

function clearDate() {
  emit('update:modelValue', '')
  emit('change', '')
  panelOpen.value = false
}

function handleClickOutside(e) {
  if (rootEl.value && !rootEl.value.contains(e.target)) {
    panelOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onBeforeUnmount(() =>
  document.removeEventListener('mousedown', handleClickOutside)
)
</script>

<template>
  <div>
    <div
      v-if="label || manageTo || manageAction"
      class="mb-2 flex items-center justify-between gap-3"
    >
      <label v-if="label" class="label !mb-0">{{ label }}</label>
      <button
        v-if="manageAction"
        type="button"
        class="shrink-0 text-xs font-medium text-primary"
        @click="$emit('manage')"
      >
        {{ manageLabel || '快捷新增分类' }}
      </button>
      <router-link
        v-else-if="manageTo"
        :to="manageTo"
        class="shrink-0 text-xs font-medium text-primary"
      >
        {{ manageLabel || '快捷新增分类' }}
      </router-link>
    </div>
    <div class="space-y-3">
      <!-- Type tabs (income/expense) -->
      <div v-if="showType" class="flex gap-2 mb-2">
        <button
          v-for="t in types"
          :key="t.value"
          type="button"
          class="btn-sm flex-1"
          :disabled="typeSwitchDisabled"
          :class="
            selectedType === t.value
              ? t.value === 'income'
                ? 'bg-emerald-500 text-white'
                : 'bg-rose-500 text-white'
              : 'btn-secondary'
          "
          :title="
            typeSwitchDisabled ? '编辑账目时不能切换收入和支出类型' : undefined
          "
          @click="switchType(t.value)"
        >
          {{ t.label }}
        </button>
      </div>
      <div
        v-if="!parentCategories.length"
        class="rounded-2xl border border-dashed border-border bg-surface-secondary/30 px-4 py-4 text-sm"
      >
        <p class="font-medium text-on-surface">
          {{ emptyTitle }}
        </p>
        <p class="mt-1 text-on-surface-secondary">
          {{ emptyDescription }}
        </p>
        <button
          v-if="manageAction"
          type="button"
          class="mt-3 inline-flex text-sm font-medium text-primary"
          @click="$emit('manage')"
        >
          {{ manageLabel || '快捷新增分类' }}
        </button>
        <router-link
          v-else-if="manageTo"
          :to="manageTo"
          class="mt-3 inline-flex text-sm font-medium text-primary"
        >
          {{ manageLabel || '快捷新增分类' }}
        </router-link>
      </div>
      <!-- Parent categories -->
      <div
        v-else
        class="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto pr-1 scrollbar-thin sm:grid-cols-5"
      >
        <button
          v-for="cat in parentCategories"
          :key="cat.id"
          type="button"
          class="flex min-w-0 flex-col items-center rounded-xl border px-2 py-2 text-xs transition-all"
          :class="
            selectedParent === cat.id
              ? 'bg-surface-secondary font-semibold'
              : 'border-transparent hover:bg-surface-secondary'
          "
          :style="getCategoryButtonStyle(cat, selectedParent === cat.id)"
          @click="toggleParent(cat.id)"
        >
          <AppIcon :name="cat.icon" :size="22" />
          <span class="mt-0.5 truncate w-full text-center">{{ cat.name }}</span>
        </button>
      </div>
      <!-- Children -->
      <div
        v-if="children.length"
        class="grid grid-cols-4 gap-2 border-t border-border pt-2 sm:grid-cols-5"
      >
        <button
          v-for="cat in children"
          :key="cat.id"
          type="button"
          class="flex min-w-0 flex-col items-center rounded-xl border px-2 py-2 text-xs transition-all"
          :class="
            selectedId === cat.id
              ? 'bg-surface-secondary font-semibold'
              : 'border-transparent hover:bg-surface-secondary'
          "
          :style="getCategoryButtonStyle(cat, selectedId === cat.id)"
          @click="selectCategory(cat.id)"
        >
          <AppIcon :name="cat.icon" :size="20" />
          <span class="mt-0.5 truncate w-full text-center">{{ cat.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useCategoriesStore } from '../stores/categories.js'
import AppIcon from './AppIcon.vue'
import { getCategoryAccentColor } from '../utils/category-ui.js'

const props = defineProps({
  modelValue: Number,
  label: String,
  type: String, // income or expense
  showType: Boolean,
  typeSwitchDisabled: Boolean,
  manageTo: {
    type: [String, Object],
    default: null
  },
  manageLabel: String,
  manageAction: Boolean
})
const emit = defineEmits(['update:modelValue', 'update:type', 'manage'])

const store = useCategoriesStore()
const selectedType = ref(props.type || 'expense')
const selectedParent = ref(null)
const selectedId = ref(props.modelValue)

const types = [
  { value: 'expense', label: '支出' },
  { value: 'income', label: '收入' }
]

const parentCategories = computed(() => {
  const tree =
    selectedType.value === 'income' ? store.incomeTree : store.expenseTree
  return tree
})

const children = computed(() => {
  if (!selectedParent.value) return []
  const parent = parentCategories.value.find(c => c.id === selectedParent.value)
  return parent?.children || []
})

const emptyTitle = computed(() =>
  selectedType.value === 'income' ? '还没有收入分类' : '还没有支出分类'
)

const emptyDescription = computed(() =>
  selectedType.value === 'income'
    ? '先添加工资、奖金、报销、副业等收入来源分类，再回来继续填写。'
    : '先添加餐饮、购物、交通等支出分类，再回来继续填写。'
)

function switchType(type) {
  if (props.typeSwitchDisabled) {
    return
  }

  selectedType.value = type
  selectedParent.value = null
  selectedId.value = null
  emit('update:modelValue', null)
}

function toggleParent(id) {
  selectedParent.value = id
  const parent = parentCategories.value.find(c => c.id === id)
  if (!parent?.children?.length) {
    selectCategory(id)
  } else {
    selectedId.value = null
  }
}

function selectCategory(id) {
  selectedId.value = id
  emit('update:modelValue', id)
  emit('update:type', selectedType.value)
}

function getCategoryButtonStyle(category, selected) {
  const accentColor = getCategoryAccentColor(category)
  if (!accentColor) {
    return {}
  }

  return {
    color: accentColor,
    borderColor: selected ? accentColor : 'transparent'
  }
}

function syncSelectionState(categoryId) {
  selectedId.value = categoryId || null

  if (!categoryId) {
    return
  }

  const flat = store.flatList
  const cat = flat.find(item => item.id === categoryId)
  if (!cat) {
    return
  }

  selectedType.value = cat.type
  selectedParent.value = cat.parent_id || cat.id
}

watch(
  () => props.modelValue,
  value => {
    syncSelectionState(value)
  },
  { immediate: true }
)

watch(
  () => store.flatList,
  () => {
    if (props.modelValue && !selectedParent.value) {
      syncSelectionState(props.modelValue)
    }
  }
)

watch(
  () => props.type,
  value => {
    if (value && !props.modelValue) {
      selectedType.value = value
    }
  }
)

watch(selectedType, t => {
  emit('update:type', t)
})
</script>

<template>
  <div>
    <label v-if="label" class="label">{{ label }}</label>
    <div class="space-y-1">
      <!-- Type tabs (income/expense) -->
      <div v-if="showType" class="flex gap-2 mb-2">
        <button
          v-for="t in types"
          :key="t.value"
          type="button"
          class="btn-sm flex-1"
          :class="
            selectedType === t.value
              ? t.value === 'income'
                ? 'bg-emerald-500 text-white'
                : 'bg-rose-500 text-white'
              : 'btn-secondary'
          "
          @click="switchType(t.value)"
        >
          {{ t.label }}
        </button>
      </div>
      <!-- Parent categories -->
      <div
        class="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto scrollbar-thin"
      >
        <button
          v-for="cat in parentCategories"
          :key="cat.id"
          type="button"
          class="flex flex-col items-center p-2 rounded-lg text-xs transition-all border"
          :class="
            selectedParent === cat.id
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-transparent hover:bg-surface-secondary'
          "
          @click="toggleParent(cat.id)"
        >
          <span class="text-xl">{{ cat.icon }}</span>
          <span class="mt-0.5 truncate w-full text-center">{{ cat.name }}</span>
        </button>
      </div>
      <!-- Children -->
      <div
        v-if="children.length"
        class="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-2 border-t border-border"
      >
        <button
          v-for="cat in children"
          :key="cat.id"
          type="button"
          class="flex flex-col items-center p-2 rounded-lg text-xs transition-all border"
          :class="
            selectedId === cat.id
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-transparent hover:bg-surface-secondary'
          "
          @click="selectCategory(cat.id)"
        >
          <span class="text-lg">{{ cat.icon }}</span>
          <span class="mt-0.5 truncate w-full text-center">{{ cat.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useCategoriesStore } from '../stores/categories.js'

const props = defineProps({
  modelValue: Number,
  label: String,
  type: String, // income or expense
  showType: Boolean
})
const emit = defineEmits(['update:modelValue', 'update:type'])

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

function switchType(type) {
  selectedType.value = type
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

watch(
  () => props.modelValue,
  v => {
    selectedId.value = v
    if (v) {
      const flat = store.flatList
      const cat = flat.find(c => c.id === v)
      if (cat) {
        selectedType.value = cat.type
        selectedParent.value = cat.parent_id || cat.id
      }
    }
  }
)

watch(selectedType, t => {
  emit('update:type', t)
})
</script>

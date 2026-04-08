<template>
  <AppModal
    :show="show"
    title="预览导入账目"
    max-width="4xl"
    @close="$emit('cancel')"
  >
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-sm text-on-surface-secondary">
          已选 {{ checkedCount }} / {{ editableList.length }} 条账目
        </p>
        <div
          v-if="validationErrors.length"
          class="text-sm text-red-500 font-medium"
        >
          {{ validationErrors.length }} 条校验错误
        </div>
      </div>

      <div
        v-if="validationErrors.length"
        class="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 space-y-1"
      >
        <p class="text-sm font-medium text-red-600 dark:text-red-400">
          格式校验未通过：
        </p>
        <ul
          class="list-disc pl-5 text-sm text-red-500 max-h-32 overflow-y-auto scrollbar-thin custom-scroll"
        >
          <li v-for="(err, i) in validationErrors" :key="i">{{ err }}</li>
        </ul>
      </div>

      <div class="overflow-x-auto -mx-5 px-5 scrollbar-thin custom-scroll">
        <table class="w-full text-sm border-collapse min-w-[780px]">
          <thead>
            <tr
              class="border-b border-border text-left text-on-surface-secondary"
            >
              <th class="py-2 pr-2 font-medium w-8">
                <input
                  type="checkbox"
                  :checked="isAllChecked"
                  :indeterminate="isIndeterminate"
                  @change="toggleAll"
                  class="accent-primary"
                />
              </th>
              <th class="py-2 pr-2 font-medium w-8">#</th>
              <th class="py-2 pr-2 font-medium w-[72px]">类型</th>
              <th class="py-2 pr-2 font-medium w-[100px]">金额</th>
              <th class="py-2 pr-2 font-medium w-[80px]">币种</th>
              <th class="py-2 pr-2 font-medium min-w-[140px]">分类</th>
              <th class="py-2 pr-2 font-medium w-[130px]">日期</th>
              <th class="py-2 pr-2 font-medium min-w-[100px]">备注</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in editableList"
              :key="i"
              class="border-b border-border/50"
              :class="
                errorIndexSet.has(i) ? 'bg-red-50 dark:bg-red-900/10' : ''
              "
            >
              <td class="py-1.5 pr-2">
                <input
                  type="checkbox"
                  :checked="checkedSet.has(i)"
                  @change="toggleItem(i)"
                  class="accent-primary"
                />
              </td>
              <td class="py-1.5 pr-2 text-on-surface-secondary">
                {{ i + 1 }}
              </td>
              <td class="py-1.5 pr-2">
                <select
                  :value="row.type"
                  class="edit-cell batch-preview-select w-full"
                  @change="updateField(i, 'type', $event.target.value)"
                >
                  <option value="expense">支出</option>
                  <option value="income">收入</option>
                </select>
              </td>
              <td class="py-1.5 pr-2">
                <input
                  type="number"
                  :value="row.amount"
                  step="0.01"
                  min="0.01"
                  class="edit-cell w-full font-mono"
                  @change="updateField(i, 'amount', $event.target.value)"
                />
              </td>
              <td class="py-1.5 pr-2">
                <select
                  :value="row.currency"
                  class="edit-cell batch-preview-select w-full"
                  @change="updateField(i, 'currency', $event.target.value)"
                >
                  <option
                    v-for="cur in currencyList"
                    :key="cur.code"
                    :value="cur.code"
                  >
                    {{ cur.code }} - {{ cur.name }}
                  </option>
                </select>
              </td>
              <td class="py-1.5 pr-2">
                <select
                  :value="String(row.category_id || '')"
                  class="edit-cell batch-preview-select w-full"
                  @change="updateCategory(i, $event.target.value)"
                >
                  <option value="" disabled>请选择</option>
                  <option
                    v-for="cat in getOrderedCategories(row.type)"
                    :key="cat.id"
                    :value="String(cat.id)"
                  >
                    {{ cat.indent }}{{ cat.name }}
                  </option>
                </select>
              </td>
              <td class="py-1.5 pr-2">
                <DatePicker
                  :modelValue="row.date"
                  @update:modelValue="updateField(i, 'date', $event)"
                  :week-start="weekStart"
                  input-class="batch-date-picker"
                />
              </td>
              <td class="py-1.5 pr-2">
                <input
                  type="text"
                  :value="row.note"
                  maxlength="500"
                  class="edit-cell w-full"
                  placeholder="-"
                  @change="updateField(i, 'note', $event.target.value)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <template #footer>
      <button class="btn-secondary btn-sm" @click="$emit('cancel')">
        取消
      </button>
      <button
        class="btn-primary btn-sm"
        :disabled="checkedCount === 0 || hasCheckedErrors"
        @click="handleConfirm"
      >
        确认导入 ({{ checkedCount }})
      </button>
    </template>
  </AppModal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import AppModal from './AppModal.vue'
import DatePicker from './DatePicker.vue'

const props = defineProps({
  show: Boolean,
  transactions: { type: Array, default: () => [] },
  errors: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
  categoryTree: { type: Array, default: () => [] },
  currencies: { type: Array, default: () => [] },
  weekStart: { type: Number, default: 1 }
})

const emit = defineEmits(['confirm', 'cancel'])

const editableList = ref([])
const checkedSet = ref(new Set())
const validationErrors = ref([])
const errorIndexSet = ref(new Set())

const currencyList = computed(() => {
  return props.currencies.length
    ? props.currencies
    : [{ code: 'CNY', name: '人民币' }]
})

watch(
  () => props.show,
  val => {
    if (val) {
      initEditableList()
    }
  }
)

function initEditableList() {
  const list = props.transactions.map(t => {
    const raw = { ...t }
    const type = String(raw.type || '').trim()
    const categoryId =
      raw.category_id != null && raw.category_id !== ''
        ? Number(raw.category_id)
        : null

    let resolvedCategoryId = categoryId
    if (!resolvedCategoryId && raw.category_name) {
      resolvedCategoryId = resolveCategoryFromName(
        String(raw.category_name || '').trim(),
        String(raw.parent_category_name || '').trim(),
        type
      )
    }

    return {
      type: type || 'expense',
      amount: raw.amount,
      currency: String(raw.currency || 'CNY')
        .trim()
        .toUpperCase(),
      category_id: resolvedCategoryId,
      date: String(raw.date || '').trim(),
      note: String(raw.note || '').trim()
    }
  })
  editableList.value = list

  const initial = new Set()
  for (let i = 0; i < list.length; i++) {
    initial.add(i)
  }
  checkedSet.value = initial

  revalidate()
}

function resolveCategoryFromName(categoryName, parentCategoryName, type) {
  const flat = props.categories
  if (!categoryName) return null

  if (parentCategoryName) {
    const parent = flat.find(
      c => c.name === parentCategoryName && c.type === type && !c.parent_id
    )
    if (!parent) return null
    const child = flat.find(
      c =>
        c.name === categoryName && c.type === type && c.parent_id === parent.id
    )
    return child ? child.id : null
  }

  const candidates = flat.filter(
    c => c.name === categoryName && c.type === type
  )
  if (candidates.length === 1) return candidates[0].id
  return null
}

function updateField(index, field, value) {
  const row = editableList.value[index]
  if (field === 'amount') {
    row[field] = Number(value)
  } else if (field === 'currency') {
    row[field] = String(value).trim().toUpperCase()
  } else {
    row[field] = value
  }

  if (field === 'type') {
    const cat = props.categories.find(c => c.id === row.category_id)
    if (cat && cat.type !== value) {
      row.category_id = null
    }
  }

  revalidate()
}

function updateCategory(index, value) {
  editableList.value[index].category_id = value ? Number(value) : null
  revalidate()
}

function getCategoryOptions(type) {
  return props.categoryTree.filter(c => c.type === type)
}

function getOrderedCategories(type) {
  const result = []
  for (const parent of props.categoryTree.filter(c => c.type === type)) {
    if (!parent.children || !parent.children.length) {
      result.push({ id: parent.id, name: parent.name, indent: '' })
    } else {
      result.push({ id: parent.id, name: parent.name, indent: '' })
      for (const child of parent.children) {
        result.push({ id: child.id, name: child.name, indent: '\u00A0\u00A0' })
      }
    }
  }
  return result
}

function revalidate() {
  const errors = []
  const errSet = new Set()
  const dateReg = /^\d{4}-\d{2}-\d{2}$/

  for (let i = 0; i < editableList.value.length; i++) {
    const t = editableList.value[i]
    const idx = i + 1
    let hasErr = false

    if (t.type !== 'income' && t.type !== 'expense') {
      errors.push(`第 ${idx} 条：type 必须是 income 或 expense`)
      hasErr = true
    }

    const amount = Number(t.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(`第 ${idx} 条：amount 必须大于 0`)
      hasErr = true
    }

    if (!dateReg.test(t.date)) {
      errors.push(`第 ${idx} 条：date 格式应为 YYYY-MM-DD`)
      hasErr = true
    }

    if (!t.category_id) {
      errors.push(`第 ${idx} 条：请选择分类`)
      hasErr = true
    } else {
      const cat = props.categories.find(c => c.id === t.category_id)
      if (!cat) {
        errors.push(`第 ${idx} 条：分类不存在`)
        hasErr = true
      } else if (cat.type !== t.type) {
        errors.push(
          `第 ${idx} 条：分类 "${cat.name}" 类型为 ${cat.type}，与账目类型 ${t.type} 不一致`
        )
        hasErr = true
      }
    }

    if (hasErr) errSet.add(i)
  }

  validationErrors.value = errors
  errorIndexSet.value = errSet
}

const checkedCount = computed(() => checkedSet.value.size)

const validCount = computed(
  () => editableList.value.length - errorIndexSet.value.size
)

const isAllChecked = computed(
  () =>
    editableList.value.length > 0 &&
    checkedCount.value === editableList.value.length
)

const isIndeterminate = computed(
  () => checkedCount.value > 0 && checkedCount.value < editableList.value.length
)

const hasCheckedErrors = computed(() => {
  for (const idx of checkedSet.value) {
    if (errorIndexSet.value.has(idx)) return true
  }
  return false
})

function toggleAll() {
  if (isAllChecked.value) {
    checkedSet.value = new Set()
  } else {
    const next = new Set()
    for (let i = 0; i < editableList.value.length; i++) {
      next.add(i)
    }
    checkedSet.value = next
  }
}

function toggleItem(index) {
  const next = new Set(checkedSet.value)
  if (next.has(index)) {
    next.delete(index)
  } else {
    next.add(index)
  }
  checkedSet.value = next
}

function handleConfirm() {
  const selected = []
  for (let i = 0; i < editableList.value.length; i++) {
    if (checkedSet.value.has(i)) {
      selected.push(editableList.value[i])
    }
  }
  emit('confirm', selected)
}
</script>

<style scoped>
.edit-cell {
  padding: 3px 6px;
  font-size: 0.8125rem;
  line-height: 1.4;
  border: 1px solid rgb(var(--color-border));
  border-radius: 6px;
  background: rgb(var(--color-surface));
  color: rgb(var(--color-on-surface));
  outline: none;
  transition: border-color 0.15s;
}
.edit-cell:focus {
  border-color: rgb(var(--color-primary));
}
</style>

<style>
.batch-preview-select option {
  background: rgb(var(--color-surface));
  color: rgb(var(--color-on-surface));
}
.batch-date-picker .input {
  padding: 3px 6px !important;
  font-size: 0.8125rem !important;
  line-height: 1.4 !important;
  border-radius: 6px !important;
  min-height: auto !important;
}
</style>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-3">
      <button class="btn-ghost btn-sm" @click="handleBack">← 返回</button>
      <h1 class="page-title">{{ isEdit ? '编辑账目' : '记一笔' }}</h1>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-5">
      <!-- Category picker -->
      <CategoryPicker
        v-model="form.category_id"
        :type="form.type"
        show-type
        :type-switch-disabled="isEdit"
        manage-action
        manage-label="快捷设置分类"
        label="选择分类"
        @update:type="form.type = $event"
        @manage="showQuickCategoryDialog = true"
      />

      <!-- Amount + Currency -->
      <CurrencyInput
        v-model="form.amount"
        :currency="form.currency"
        @update:currency="form.currency = $event"
      />

      <!-- Date -->
      <div>
        <label class="label">日期</label>
        <DatePicker
          v-model="form.date"
          :week-start="Number(settingsStore.settings.week_start) || 1"
        />
      </div>

      <!-- Note -->
      <div>
        <label class="label">备注</label>
        <input
          v-model="form.note"
          class="input"
          placeholder="可选备注"
          maxlength="200"
        />
      </div>

      <div class="flex gap-3">
        <button type="submit" class="btn-primary flex-1" :disabled="saving">
          {{ saving ? '保存中...' : '保存' }}
        </button>
        <button
          v-if="isEdit"
          type="button"
          class="btn-danger"
          @click="showDelete = true"
        >
          删除
        </button>
      </div>
    </form>

    <ConfirmDialog
      :show="showDelete"
      title="删除账目"
      message="确定要删除这条账目记录吗？"
      confirm-text="删除"
      danger
      @confirm="handleDelete"
      @cancel="showDelete = false"
    />

    <CategoryQuickCreateDialog
      :show="showQuickCategoryDialog"
      :type="form.type"
      :preferred-parent-id="preferredParentId"
      @close="showQuickCategoryDialog = false"
      @created="handleCategoryCreated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTransactionsStore } from '../stores/transactions.js'
import { useCategoriesStore } from '../stores/categories.js'
import { useSettingsStore } from '../stores/settings.js'
import { useToastStore } from '../stores/toast.js'
import { api } from '../api/client.js'
import CategoryPicker from '../components/CategoryPicker.vue'
import CategoryQuickCreateDialog from '../components/CategoryQuickCreateDialog.vue'
import CurrencyInput from '../components/CurrencyInput.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import DatePicker from '../components/DatePicker.vue'
import { getLocalToday } from '../utils/date.js'

const route = useRoute()
const router = useRouter()
const store = useTransactionsStore()
const categoriesStore = useCategoriesStore()
const settingsStore = useSettingsStore()
const toastStore = useToastStore()

const isEdit = computed(() => !!route.params.id)
const saving = ref(false)
const showDelete = ref(false)
const showQuickCategoryDialog = ref(false)
const appliedPrefillCategoryId = ref(null)

const form = ref({
  type: 'expense',
  amount: null,
  currency: settingsStore.settings.default_currency,
  category_id: null,
  date: getLocalToday(),
  note: ''
})

const preferredParentId = computed(() => {
  const category = categoriesStore.flatList.find(
    item => item.id === form.value.category_id
  )

  return category ? category.parent_id || category.id : null
})

async function loadTransaction() {
  if (!isEdit.value) return
  try {
    const txn = await api.get(`/transactions/${route.params.id}`)
    form.value = {
      type: txn.type,
      amount: txn.amount,
      currency: txn.currency,
      category_id: txn.category_id,
      date: txn.date,
      note: txn.note || ''
    }
  } catch (e) {
    toastStore.error('加载失败: ' + e.message, { title: '账目加载失败' })
  }
}

function getReturnToRoute() {
  return typeof route.query.return_to === 'string' && route.query.return_to
    ? route.query.return_to
    : null
}

function handleBack() {
  const returnTo = getReturnToRoute()

  if (returnTo) {
    router.push(returnTo)
    return
  }

  router.back()
}

function applyPrefilledCategory() {
  if (isEdit.value) {
    return
  }

  const nextCategoryId = Number(route.query.category_id)

  if (!Number.isInteger(nextCategoryId) || nextCategoryId <= 0) {
    return
  }

  if (appliedPrefillCategoryId.value === nextCategoryId) {
    return
  }

  const category = categoriesStore.flatList.find(
    item => item.id === nextCategoryId
  )

  if (!category) {
    return
  }

  form.value.category_id = category.id
  form.value.type = category.type
  appliedPrefillCategoryId.value = nextCategoryId
}

function handleCategoryCreated(category) {
  form.value.category_id = category.id
  form.value.type = category.type
}

async function handleSubmit() {
  if (!form.value.category_id) {
    toastStore.error('请选择分类', { title: '表单校验失败' })
    return
  }
  if (!form.value.amount || form.value.amount <= 0) {
    toastStore.error('请输入有效金额', { title: '表单校验失败' })
    return
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await store.update(Number(route.params.id), form.value)
    } else {
      await store.create(form.value)
    }

    const returnTo = getReturnToRoute()

    if (returnTo) {
      router.replace(returnTo)
      return
    }

    router.back()
  } catch (e) {
    toastStore.error(e.message, {
      title: isEdit.value ? '账目保存失败' : '账目创建失败'
    })
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  try {
    await store.remove(Number(route.params.id))

    const returnTo = getReturnToRoute()

    if (returnTo) {
      router.replace(returnTo)
      return
    }

    router.replace('/transactions')
  } catch (e) {
    toastStore.error(e.message, { title: '账目删除失败' })
  }
  showDelete.value = false
}

watch(
  () => [
    isEdit.value,
    route.query.category_id,
    categoriesStore.flatList.length
  ],
  () => {
    applyPrefilledCategory()
  },
  { immediate: true }
)

onMounted(async () => {
  if (!categoriesStore.tree.length) {
    await categoriesStore.fetch()
  }

  await loadTransaction()
})
</script>

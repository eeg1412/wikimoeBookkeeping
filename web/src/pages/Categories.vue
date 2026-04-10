<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="page-title">分类管理</h1>
      <button class="btn-primary btn-sm" @click="openCreate(null)">
        + 新增大类
      </button>
    </div>

    <div class="flex gap-2">
      <button
        class="btn-sm flex-1"
        :class="activeType === 'expense' ? 'btn-primary' : 'btn-secondary'"
        @click="activeType = 'expense'"
      >
        支出
      </button>
      <button
        class="btn-sm flex-1"
        :class="activeType === 'income' ? 'btn-primary' : 'btn-secondary'"
        @click="activeType = 'income'"
      >
        收入
      </button>
    </div>

    <div
      v-if="store.loading"
      class="py-12 text-center text-on-surface-secondary"
    >
      加载中...
    </div>
    <div
      v-else-if="!filteredTree.length"
      class="py-12 text-center text-on-surface-secondary"
    >
      暂无分类
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="parent in filteredTree"
        :key="parent.id"
        class="card !p-0 overflow-hidden"
      >
        <div
          class="flex flex-wrap items-center gap-2 bg-surface-secondary px-4 py-3 sm:gap-3"
        >
          <div
            class="flex min-w-0 flex-1 items-center gap-3"
            :style="{ color: parent.color }"
          >
            <AppIcon :name="parent.icon" :size="24" />
            <span class="truncate font-medium">{{ parent.name }}</span>
          </div>
          <button class="btn-ghost btn-sm text-xs" @click="openCreate(parent)">
            + 子类
          </button>
          <button class="btn-ghost btn-sm text-xs" @click="openEdit(parent)">
            编辑
          </button>
          <button
            class="btn-ghost btn-sm text-xs text-red-500"
            @click="confirmDelete(parent)"
          >
            删除
          </button>
        </div>
        <div v-if="parent.children?.length" class="divide-y divide-border">
          <div
            v-for="child in parent.children"
            :key="child.id"
            class="flex flex-wrap items-center gap-2 px-4 py-2.5 pl-10 sm:gap-3"
          >
            <div
              class="flex min-w-0 flex-1 items-center gap-3"
              :style="{ color: child.effective_color }"
            >
              <AppIcon :name="child.icon" :size="22" />
              <span class="truncate text-sm">{{ child.name }}</span>
            </div>
            <button class="btn-ghost btn-sm text-xs" @click="openEdit(child)">
              编辑
            </button>
            <button
              class="btn-ghost btn-sm text-xs text-red-500"
              @click="confirmDelete(child)"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <AppModal
      :show="showForm"
      :title="formTitle"
      max-width="4xl"
      @close="showForm = false"
    >
      <div class="space-y-4">
        <div>
          <label class="label">名称</label>
          <input
            v-model="formName"
            class="input"
            :class="formFieldErrors.name ? '!border-red-500' : ''"
            placeholder="分类名称"
            maxlength="20"
            @input="clearFormFieldError('name')"
          />
          <p v-if="formFieldErrors.name" class="mt-1 text-sm text-red-500">
            {{ formFieldErrors.name }}
          </p>
        </div>

        <div>
          <label class="label">图标</label>
          <div
            class="space-y-3 overflow-x-hidden rounded-2xl border border-border bg-surface-secondary/40 p-3"
          >
            <div
              class="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2"
            >
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-surface"
                :style="{
                  color: previewAccentColor
                }"
              >
                <AppIcon :name="formIcon" :size="26" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-on-surface">已选图标</p>
                <p class="text-xs text-on-surface-secondary">
                  {{ selectedIconLabel }}
                </p>
              </div>
            </div>

            <div class="space-y-4 overflow-x-hidden">
              <section
                v-for="group in iconGroups"
                :key="group.id"
                class="space-y-2"
              >
                <div
                  class="sticky top-0 z-10 bg-surface-secondary/95 px-2 py-1 text-xs font-semibold tracking-wide text-on-surface-secondary backdrop-blur"
                >
                  {{ group.label }}
                </div>
                <div
                  class="grid grid-cols-4 gap-2 p-1 sm:grid-cols-5 lg:grid-cols-6"
                >
                  <button
                    v-for="icon in group.icons"
                    :key="icon.name"
                    type="button"
                    class="flex aspect-square min-w-0 flex-col items-center justify-center rounded-xl border border-transparent bg-surface px-1 text-on-surface-secondary transition-all"
                    :class="
                      formIcon === icon.name
                        ? 'font-semibold'
                        : 'hover:border-border hover:bg-surface-secondary'
                    "
                    :style="getIconOptionStyle(formIcon === icon.name)"
                    :title="icon.label"
                    @click="formIcon = icon.name"
                  >
                    <AppIcon :name="icon.name" :size="22" />
                    <span
                      class="mt-1 w-full truncate text-center text-[10px] leading-tight"
                    >
                      {{ icon.label }}
                    </span>
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>

        <div v-if="isParentForm">
          <label class="label">分类颜色</label>
          <ColorPicker v-model="formColor" />
        </div>
        <div
          v-else
          class="rounded-2xl border border-border bg-surface-secondary/40 px-4 py-3 text-sm text-on-surface-secondary"
        >
          <div class="flex items-center gap-3">
            <span
              class="h-3.5 w-3.5 shrink-0 rounded-full border border-white/70 shadow-sm"
              :style="{ backgroundColor: inheritedColor }"
            ></span>
            <span>子分类沿用大类分类颜色，当前为 {{ inheritedColor }}。</span>
          </div>
        </div>
      </div>

      <template #footer>
        <button class="btn-secondary btn-sm" @click="showForm = false">
          取消
        </button>
        <button
          class="btn-primary btn-sm"
          @click="handleSave"
          :disabled="formSaving"
        >
          {{ formSaving ? '保存中...' : '保存' }}
        </button>
      </template>
    </AppModal>

    <ConfirmDialog
      :show="deleteConfirmVisible"
      title="删除分类"
      :message="`确定要删除分类「${deletingCat?.name}」吗？`"
      :confirm-text="deleteCheckLoading ? '检查中...' : '删除'"
      :confirm-disabled="deleteCheckLoading"
      :cancel-disabled="deleteCheckLoading"
      :show-close="!deleteCheckLoading"
      :close-on-overlay="!deleteCheckLoading"
      danger
      @confirm="handleDelete"
      @cancel="resetDeleteFlow"
    />

    <ConfirmDialog
      :show="showMigrationPrompt"
      title="需要先迁移后删除"
      :message="migrationPromptMessage"
      confirm-text="继续处理"
      @confirm="openMigrationSelector"
      @cancel="resetDeleteFlow"
    />

    <AppModal
      :show="showMigrationSelector"
      title="迁移账目分类"
      :description="migrationSelectorDescription"
      max-width="lg"
      :show-close="!migrationSubmitting"
      :close-on-overlay="!migrationSubmitting"
      @close="cancelMigrationSelector"
    >
      <div class="space-y-4">
        <div
          class="rounded-2xl border border-border bg-surface-secondary/40 px-4 py-3 text-sm text-on-surface-secondary"
        >
          分类「{{ deletingCat?.name }}」当前关联 {{ deleteImpactSummary }}。
        </div>

        <div
          v-if="!migrationTargetOptions.length"
          class="rounded-2xl border border-dashed border-border bg-surface-secondary/20 px-4 py-4 text-sm text-on-surface-secondary"
        >
          当前没有可迁移到的同类型分类，请先新增一个同类型分类后再继续删除。
        </div>

        <div v-else>
          <label class="label">转移到哪个分类</label>
          <select v-model="migrationTargetId" class="select">
            <option value="">请选择同类型分类</option>
            <option
              v-for="category in migrationTargetOptions"
              :key="category.id"
              :value="String(category.id)"
            >
              {{ category.display_name }}
            </option>
          </select>
          <p class="mt-2 text-xs text-on-surface-secondary">
            为避免删除后留下失效引用，这里会一并迁移当前分类下的周期规则。
          </p>
        </div>
      </div>

      <template #footer>
        <button
          class="btn-secondary btn-sm"
          :disabled="migrationSubmitting"
          @click="cancelMigrationSelector"
        >
          取消
        </button>
        <button
          class="btn-primary btn-sm"
          :disabled="
            !migrationTargetOptions.length ||
            !migrationTargetId ||
            migrationSubmitting
          "
          @click="openMigrationFinalConfirm"
        >
          确认
        </button>
      </template>
    </AppModal>

    <ConfirmDialog
      :show="showMigrationFinalConfirm"
      title="二次确认迁移并删除"
      :message="migrationFinalMessage"
      :confirm-text="migrationSubmitting ? '迁移中...' : '确认迁移并删除'"
      :confirm-disabled="migrationSubmitting"
      :cancel-disabled="migrationSubmitting"
      :show-close="!migrationSubmitting"
      :close-on-overlay="!migrationSubmitting"
      danger
      @confirm="handleMigrateAndDelete"
      @cancel="handleMigrationFinalCancel"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { COMMON_CATEGORY_ICON } from '@shared/icon-names.js'
import { useRoute, useRouter } from 'vue-router'
import { useCategoriesStore } from '../stores/categories.js'
import { useSettingsStore } from '../stores/settings.js'
import { useToastStore } from '../stores/toast.js'
import AppModal from '../components/AppModal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import AppIcon from '../components/AppIcon.vue'
import ColorPicker from '../components/ColorPicker.vue'
import { generateCategoryColor } from '@shared/category-colors.js'
import {
  findIconLabel,
  filterIconGroups,
  normalizeIconGroups,
  toAlphaColor
} from '../utils/category-ui.js'

const route = useRoute()
const router = useRouter()
const store = useCategoriesStore()
const settingsStore = useSettingsStore()
const toastStore = useToastStore()

const activeType = ref('expense')
const showForm = ref(false)
const editingCat = ref(null)
const createParent = ref(null)
const formName = ref('')
const formIcon = ref(COMMON_CATEGORY_ICON)
const formColor = ref(generateCategoryColor())
const formFieldErrors = ref({ name: '' })
const formError = ref('')
const formSaving = ref(false)
const deletingCat = ref(null)
const deletePlan = ref(null)
const deleteCheckLoading = ref(false)
const showMigrationPrompt = ref(false)
const showMigrationSelector = ref(false)
const showMigrationFinalConfirm = ref(false)
const migrationTargetId = ref('')
const migrationSubmitting = ref(false)

const allIconGroups = computed(() => normalizeIconGroups(settingsStore.icons))
const currentIconType = computed(
  () => editingCat.value?.type || createParent.value?.type || activeType.value
)
const iconGroups = computed(() =>
  filterIconGroups(allIconGroups.value, currentIconType.value)
)
const formTitle = computed(() => {
  if (editingCat.value) {
    return '编辑分类'
  }

  return createParent.value ? '新增子分类' : '新增大类'
})
const selectedIconLabel = computed(
  () =>
    findIconLabel(iconGroups.value, formIcon.value) ||
    findIconLabel(allIconGroups.value, formIcon.value) ||
    formIcon.value
)

const filteredTree = computed(() =>
  activeType.value === 'income' ? store.incomeTree : store.expenseTree
)
const isParentForm = computed(() =>
  editingCat.value ? !editingCat.value.parent_id : !createParent.value
)
const inheritedColor = computed(
  () =>
    createParent.value?.effective_color ||
    editingCat.value?.effective_color ||
    formColor.value
)
const previewAccentColor = computed(() =>
  isParentForm.value ? formColor.value : inheritedColor.value
)
const deleteConfirmVisible = computed(
  () =>
    !!deletingCat.value &&
    !showMigrationPrompt.value &&
    !showMigrationSelector.value &&
    !showMigrationFinalConfirm.value
)
const categoryLookup = computed(
  () => new Map(store.flatList.map(category => [category.id, category]))
)
const migrationTargetOptions = computed(() => {
  if (!deletingCat.value) {
    return []
  }

  return store.flatList
    .filter(
      category =>
        category.id !== deletingCat.value.id &&
        category.type === deletingCat.value.type
    )
    .map(category => ({
      ...category,
      display_name: formatCategoryPathName(category)
    }))
})
const selectedMigrationTarget = computed(() => {
  if (!migrationTargetId.value) {
    return null
  }

  return (
    migrationTargetOptions.value.find(
      category => String(category.id) === migrationTargetId.value
    ) || null
  )
})
const deleteImpactSummary = computed(() => {
  const segments = []
  const transactionCount = deletePlan.value?.transaction_count || 0
  const recurringRuleCount = deletePlan.value?.recurring_rule_count || 0

  if (transactionCount > 0) {
    segments.push(`${transactionCount} 条账目`)
  }

  if (recurringRuleCount > 0) {
    segments.push(`${recurringRuleCount} 条周期规则`)
  }

  return segments.length ? segments.join('、') : '无关联数据'
})
const migrationPromptMessage = computed(() => {
  if (!deletingCat.value || !deletePlan.value) {
    return ''
  }

  return `分类「${deletingCat.value.name}」下存在 ${deleteImpactSummary.value}，不能直接删除。是否先迁移到其他同类型分类后再删除？`
})
const migrationSelectorDescription = computed(() => {
  if (!deletingCat.value) {
    return ''
  }

  return `请选择分类「${deletingCat.value.name}」要迁移到的目标分类。`
})
const migrationFinalMessage = computed(() => {
  if (!deletingCat.value || !selectedMigrationTarget.value) {
    return ''
  }

  return `确定将 ${deleteImpactSummary.value} 迁移到「${selectedMigrationTarget.value.display_name}」并删除分类「${deletingCat.value.name}」吗？执行期间会临时锁定新增账目操作。`
})

function getIconOptionStyle(selected) {
  if (!selected) {
    return {}
  }

  return {
    color: previewAccentColor.value,
    borderColor: previewAccentColor.value,
    boxShadow: `inset 0 0 0 1px ${previewAccentColor.value}`,
    backgroundColor: toAlphaColor(previewAccentColor.value, 0.12)
  }
}

function clearFormFieldError(field) {
  if (formFieldErrors.value[field]) {
    formFieldErrors.value = {
      ...formFieldErrors.value,
      [field]: ''
    }
  }

  if (formError.value) {
    formError.value = ''
  }
}

function resetFormErrors() {
  formFieldErrors.value = { name: '' }
  formError.value = ''
}

function openCreate(parent) {
  editingCat.value = null
  createParent.value = parent
  formName.value = ''
  formIcon.value = parent?.icon || COMMON_CATEGORY_ICON
  formColor.value = parent?.effective_color || generateCategoryColor()
  resetFormErrors()
  showForm.value = true
}

function openEdit(cat) {
  editingCat.value = cat
  createParent.value = null
  formName.value = cat.name
  formIcon.value = cat.icon
  formColor.value = cat.parent_id
    ? cat.effective_color || generateCategoryColor()
    : cat.color || generateCategoryColor()
  resetFormErrors()
  showForm.value = true
}

async function handleSave() {
  const trimmedName = formName.value.trim()

  formFieldErrors.value = { name: '' }

  if (!trimmedName) {
    formFieldErrors.value.name = '请输入名称'
    formError.value = ''
    toastStore.error('请输入名称', { title: '表单校验失败' })
    return
  }

  formSaving.value = true
  formError.value = ''

  try {
    if (editingCat.value) {
      const payload = {
        name: trimmedName,
        icon: formIcon.value
      }

      if (isParentForm.value) {
        payload.color = formColor.value
      }

      await store.update(editingCat.value.id, payload)
    } else {
      const payload = {
        name: trimmedName,
        type: activeType.value,
        parent_id: createParent.value?.id || null,
        icon: formIcon.value
      }

      if (isParentForm.value) {
        payload.color = formColor.value
      }

      await store.create(payload)
    }

    showForm.value = false
  } catch (error) {
    formError.value = error.message
    toastStore.error(error.message, {
      title: editingCat.value ? '分类保存失败' : '分类创建失败'
    })
  } finally {
    formSaving.value = false
  }
}

function confirmDelete(cat) {
  resetDeleteFlow()
  deletingCat.value = cat
}

async function handleDelete() {
  if (!deletingCat.value || deleteCheckLoading.value) {
    return
  }

  deleteCheckLoading.value = true

  try {
    const plan = await store.getDeletePlan(deletingCat.value.id)
    deletePlan.value = plan

    if (plan.child_category_count > 0) {
      toastStore.error(
        `分类「${deletingCat.value.name}」下还有 ${plan.child_category_count} 个子分类，请先处理子分类。`,
        { title: '分类删除失败' }
      )
      resetDeleteFlow()
      return
    }

    if (plan.can_delete_directly) {
      const categoryName = deletingCat.value.name
      await store.remove(deletingCat.value.id)
      toastStore.success(`已删除分类「${categoryName}」`, {
        title: '分类删除成功'
      })
      resetDeleteFlow()
      return
    }

    if (plan.requires_migration) {
      showMigrationPrompt.value = true
      return
    }

    toastStore.error('当前分类暂时无法删除，请稍后重试', {
      title: '分类删除失败'
    })
    resetDeleteFlow()
  } catch (error) {
    toastStore.error(error.message, { title: '分类删除失败' })
    resetDeleteFlow()
  } finally {
    deleteCheckLoading.value = false
  }
}

function openMigrationSelector() {
  showMigrationPrompt.value = false
  showMigrationSelector.value = true
}

function cancelMigrationSelector() {
  resetDeleteFlow()
}

function openMigrationFinalConfirm() {
  if (!selectedMigrationTarget.value) {
    toastStore.error('请选择要转移到的分类', { title: '未选择目标分类' })
    return
  }

  showMigrationSelector.value = false
  showMigrationFinalConfirm.value = true
}

function handleMigrationFinalCancel() {
  showMigrationFinalConfirm.value = false
  showMigrationSelector.value = true
}

async function handleMigrateAndDelete() {
  if (
    !deletingCat.value ||
    !selectedMigrationTarget.value ||
    migrationSubmitting.value
  ) {
    return
  }

  const sourceCategoryName = deletingCat.value.name
  const targetCategory = selectedMigrationTarget.value

  migrationSubmitting.value = true

  try {
    const result = await store.migrateAndDelete(
      deletingCat.value.id,
      targetCategory.id
    )

    toastStore.success(
      buildMigrationSuccessMessage(result, targetCategory, sourceCategoryName),
      { title: '迁移并删除成功' }
    )
    resetDeleteFlow()
  } catch (error) {
    toastStore.error(error.message, { title: '迁移并删除失败' })
    showMigrationFinalConfirm.value = false
    showMigrationSelector.value = true
  } finally {
    migrationSubmitting.value = false
  }
}

function resetDeleteFlow() {
  deletingCat.value = null
  deletePlan.value = null
  deleteCheckLoading.value = false
  showMigrationPrompt.value = false
  showMigrationSelector.value = false
  showMigrationFinalConfirm.value = false
  migrationTargetId.value = ''
  migrationSubmitting.value = false
}

function formatCategoryPathName(category) {
  const parentCategory = category.parent_id
    ? categoryLookup.value.get(category.parent_id)
    : null

  return parentCategory
    ? `${parentCategory.name} / ${category.name}`
    : category.name
}

function buildMigrationSuccessMessage(
  result,
  targetCategory,
  sourceCategoryName
) {
  const segments = []

  if (result.migrated_transaction_count > 0) {
    segments.push(`${result.migrated_transaction_count} 条账目`)
  }

  if (result.migrated_recurring_rule_count > 0) {
    segments.push(`${result.migrated_recurring_rule_count} 条周期规则`)
  }

  const summary = segments.length ? segments.join('、') : '关联数据'

  return `已将分类「${sourceCategoryName}」下的 ${summary} 迁移到「${targetCategory.display_name}」并删除原分类。`
}

watch(
  () => [route.query.type, route.query.create],
  ([queryType, create]) => {
    if (queryType === 'income' || queryType === 'expense') {
      activeType.value = queryType
    }

    if (create === '1') {
      openCreate(null)
      router.replace({ name: 'Categories' })
    }
  },
  { immediate: true }
)
</script>

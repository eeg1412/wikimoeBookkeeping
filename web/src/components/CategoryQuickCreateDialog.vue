<template>
  <AppModal
    :show="show"
    title="快捷新增分类"
    max-width="4xl"
    @close="$emit('close')"
  >
    <div class="space-y-4">
      <div
        class="surface-muted-soft rounded-2xl border border-border px-4 py-3 text-sm text-on-surface-secondary"
      >
        保存后会自动选中新分类，不会清空当前正在填写的账目内容。
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label class="label">账目类型</label>
          <div
            class="surface-muted-soft rounded-xl border border-border px-4 py-3 text-sm font-medium text-on-surface"
          >
            {{ typeLabel }}
          </div>
        </div>

        <div v-if="canCreateChild">
          <label class="label">新增方式</label>
          <div class="flex gap-2">
            <button
              type="button"
              class="btn-sm flex-1"
              :class="isChildScope ? 'btn-secondary' : 'btn-primary'"
              @click="selectScope('parent')"
            >
              新增大类
            </button>
            <button
              type="button"
              class="btn-sm flex-1"
              :class="isChildScope ? 'btn-primary' : 'btn-secondary'"
              @click="selectScope('child')"
            >
              新增子类
            </button>
          </div>
        </div>
      </div>

      <div v-if="isChildScope">
        <label class="label">归属大类</label>
        <select
          v-model.number="formParentId"
          class="select"
          :class="fieldErrors.parentId ? '!border-red-500' : ''"
          @change="clearFieldError('parentId')"
        >
          <option
            v-for="parent in parentOptions"
            :key="parent.id"
            :value="parent.id"
          >
            {{ parent.name }}
          </option>
        </select>
        <p v-if="fieldErrors.parentId" class="mt-1 text-sm text-red-500">
          {{ fieldErrors.parentId }}
        </p>
      </div>

      <div>
        <label class="label">名称</label>
        <input
          v-model="formName"
          class="input"
          :class="fieldErrors.name ? '!border-red-500' : ''"
          placeholder="分类名称"
          maxlength="20"
          @input="clearFieldError('name')"
        />
        <p v-if="fieldErrors.name" class="mt-1 text-sm text-red-500">
          {{ fieldErrors.name }}
        </p>
      </div>

      <div>
        <label class="label">图标</label>
        <div
          class="surface-muted-soft space-y-3 overflow-x-hidden rounded-2xl border border-border p-3"
        >
          <div
            class="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2"
          >
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-surface"
              :style="{
                color: previewAccentColor,
                borderColor: previewAccentColor
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
                class="surface-muted-strong sticky top-0 z-10 px-2 py-1 text-xs font-semibold tracking-wide text-on-surface-secondary backdrop-blur"
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
                      : 'hover:border-border hover-surface-muted'
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

      <div v-if="!isChildScope">
        <label class="label">分类颜色</label>
        <ColorPicker v-model="formColor" />
      </div>
      <div
        v-else
        class="surface-muted-soft rounded-2xl border border-border px-4 py-3 text-sm text-on-surface-secondary"
      >
        子分类沿用大类分类颜色，当前为 {{ previewAccentColor }}。
      </div>
    </div>

    <template #footer>
      <button class="btn-secondary btn-sm" @click="$emit('close')">取消</button>
      <button class="btn-primary btn-sm" :disabled="saving" @click="handleSave">
        {{ saving ? '保存中...' : '保存并选中' }}
      </button>
    </template>
  </AppModal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { COMMON_CATEGORY_ICON } from '@shared/icon-names.js'
import { useCategoriesStore } from '../stores/categories.js'
import { useSettingsStore } from '../stores/settings.js'
import { useToastStore } from '../stores/toast.js'
import AppIcon from './AppIcon.vue'
import AppModal from './AppModal.vue'
import ColorPicker from './ColorPicker.vue'
import { generateCategoryColor } from '@shared/category-colors.js'
import {
  findIconLabel,
  filterIconGroups,
  normalizeIconGroups,
  toAlphaColor
} from '../utils/category-ui.js'

const props = defineProps({
  show: Boolean,
  type: { type: String, default: 'expense' },
  preferredParentId: { type: Number, default: null }
})

const emit = defineEmits(['close', 'created'])

const categoriesStore = useCategoriesStore()
const settingsStore = useSettingsStore()
const toastStore = useToastStore()

const scope = ref('parent')
const formParentId = ref(null)
const formName = ref('')
const formIcon = ref(COMMON_CATEGORY_ICON)
const formColor = ref(generateCategoryColor())
const fieldErrors = ref({ name: '', parentId: '' })
const errorMsg = ref('')
const saving = ref(false)

const parentOptions = computed(() =>
  props.type === 'income'
    ? categoriesStore.incomeTree
    : categoriesStore.expenseTree
)
const canCreateChild = computed(() => parentOptions.value.length > 0)
const isChildScope = computed(
  () => canCreateChild.value && scope.value === 'child'
)
const selectedParent = computed(
  () =>
    parentOptions.value.find(parent => parent.id === formParentId.value) || null
)
const typeLabel = computed(() => (props.type === 'income' ? '收入' : '支出'))
const allIconGroups = computed(() => normalizeIconGroups(settingsStore.icons))
const iconGroups = computed(() =>
  filterIconGroups(allIconGroups.value, props.type)
)
const previewAccentColor = computed(() =>
  isChildScope.value
    ? selectedParent.value?.effective_color || formColor.value
    : formColor.value
)
const selectedIconLabel = computed(
  () =>
    findIconLabel(iconGroups.value, formIcon.value) ||
    findIconLabel(allIconGroups.value, formIcon.value) ||
    formIcon.value
)

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

function clearFieldError(field) {
  if (fieldErrors.value[field]) {
    fieldErrors.value = {
      ...fieldErrors.value,
      [field]: ''
    }
  }

  if (errorMsg.value) {
    errorMsg.value = ''
  }
}

function selectScope(nextScope) {
  scope.value = nextScope
  clearFieldError('parentId')
  if (nextScope === 'child' && !formParentId.value) {
    formParentId.value = parentOptions.value[0]?.id || null
  }
}

function resetForm() {
  const fallbackParentId = parentOptions.value[0]?.id || null
  const nextParentId =
    parentOptions.value.find(parent => parent.id === props.preferredParentId)
      ?.id || fallbackParentId

  scope.value = nextParentId ? 'child' : 'parent'
  formParentId.value = nextParentId
  formName.value = ''
  formColor.value = generateCategoryColor()
  formIcon.value =
    parentOptions.value.find(parent => parent.id === nextParentId)?.icon ||
    COMMON_CATEGORY_ICON
  fieldErrors.value = { name: '', parentId: '' }
  errorMsg.value = ''
  saving.value = false
}

async function handleSave() {
  const trimmedName = formName.value.trim()

  fieldErrors.value = { name: '', parentId: '' }

  if (!trimmedName) {
    fieldErrors.value.name = '请输入名称'
    errorMsg.value = ''
    toastStore.error('请输入名称', { title: '表单校验失败' })
    return
  }

  if (isChildScope.value && !formParentId.value) {
    fieldErrors.value.parentId = '请选择归属大类'
    errorMsg.value = ''
    toastStore.error('请选择归属大类', { title: '表单校验失败' })
    return
  }

  saving.value = true
  errorMsg.value = ''

  try {
    const created = await categoriesStore.create({
      name: trimmedName,
      type: props.type,
      parent_id: isChildScope.value ? formParentId.value : null,
      icon: formIcon.value,
      color: isChildScope.value ? undefined : formColor.value
    })

    emit('created', created)
    emit('close')
  } catch (error) {
    errorMsg.value = error.message
    toastStore.error(error.message, { title: '分类创建失败' })
  } finally {
    saving.value = false
  }
}

watch(
  () => props.show,
  value => {
    if (value) {
      resetForm()
    }
  }
)

watch(
  () => props.type,
  () => {
    if (props.show) {
      resetForm()
    }
  }
)
</script>

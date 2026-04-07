<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="page-title">分类管理</h1>
      <button class="btn-primary btn-sm" @click="openCreate(null)">
        + 新增大类
      </button>
    </div>

    <!-- Type tabs -->
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

    <!-- Category tree -->
    <div
      v-if="store.loading"
      class="text-center py-12 text-on-surface-secondary"
    >
      加载中...
    </div>
    <div
      v-else-if="!filteredTree.length"
      class="text-center py-12 text-on-surface-secondary"
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
          class="flex flex-wrap items-center gap-2 px-4 py-3 bg-surface-secondary/50 sm:gap-3"
        >
          <AppIcon :name="parent.icon" :size="22" />
          <span class="font-medium flex-1 min-w-0 truncate">{{
            parent.name
          }}</span>
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
            <AppIcon :name="child.icon" :size="20" />
            <span class="text-sm flex-1 min-w-0 truncate">{{
              child.name
            }}</span>
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

    <!-- Edit/Create Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showForm"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          @click.self="showForm = false"
        >
          <div
            class="bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6 border border-border space-y-4"
          >
            <h3 class="text-lg font-bold">
              {{
                editingCat
                  ? '编辑分类'
                  : createParent
                    ? '新增子分类'
                    : '新增大类'
              }}
            </h3>
            <div>
              <label class="label">名称</label>
              <input
                v-model="formName"
                class="input"
                placeholder="分类名称"
                maxlength="20"
              />
            </div>
            <div>
              <label class="label">图标</label>
              <div class="grid grid-cols-8 gap-1.5 max-h-32 overflow-y-auto">
                <button
                  v-for="icon in icons"
                  :key="icon"
                  class="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  :class="
                    formIcon === icon
                      ? 'bg-primary/20 ring-2 ring-primary'
                      : 'hover:bg-surface-secondary'
                  "
                  @click="formIcon = icon"
                >
                  <AppIcon :name="icon" :size="18" />
                </button>
              </div>
            </div>
            <p v-if="formError" class="text-sm text-red-500">{{ formError }}</p>
            <div class="flex gap-3 justify-end">
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
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      :show="!!deletingCat"
      title="删除分类"
      :message="`确定要删除分类「${deletingCat?.name}」吗？`"
      confirm-text="删除"
      danger
      @confirm="handleDelete"
      @cancel="deletingCat = null"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCategoriesStore } from '../stores/categories.js'
import { useSettingsStore } from '../stores/settings.js'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import AppIcon from '../components/AppIcon.vue'

const store = useCategoriesStore()
const settingsStore = useSettingsStore()
const icons = computed(() => settingsStore.icons)

const activeType = ref('expense')
const showForm = ref(false)
const editingCat = ref(null)
const createParent = ref(null)
const formName = ref('')
const formIcon = ref('folder')
const formError = ref('')
const formSaving = ref(false)
const deletingCat = ref(null)

const filteredTree = computed(() =>
  activeType.value === 'income' ? store.incomeTree : store.expenseTree
)

function openCreate(parent) {
  editingCat.value = null
  createParent.value = parent
  formName.value = ''
  formIcon.value = 'folder'
  formError.value = ''
  showForm.value = true
}

function openEdit(cat) {
  editingCat.value = cat
  createParent.value = null
  formName.value = cat.name
  formIcon.value = cat.icon
  formError.value = ''
  showForm.value = true
}

async function handleSave() {
  if (!formName.value.trim()) {
    formError.value = '请输入名称'
    return
  }
  formSaving.value = true
  formError.value = ''
  try {
    if (editingCat.value) {
      await store.update(editingCat.value.id, {
        name: formName.value.trim(),
        icon: formIcon.value
      })
    } else {
      await store.create({
        name: formName.value.trim(),
        type: activeType.value,
        parent_id: createParent.value?.id || null,
        icon: formIcon.value
      })
    }
    showForm.value = false
  } catch (e) {
    formError.value = e.message
  } finally {
    formSaving.value = false
  }
}

function confirmDelete(cat) {
  deletingCat.value = cat
}

async function handleDelete() {
  try {
    await store.remove(deletingCat.value.id)
  } catch (e) {
    alert(e.message)
  }
  deletingCat.value = null
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>

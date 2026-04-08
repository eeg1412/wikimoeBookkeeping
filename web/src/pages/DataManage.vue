<template>
  <div class="space-y-6">
    <h1 class="page-title">数据管理</h1>

    <!-- Export -->
    <div class="card space-y-3">
      <h2 class="font-bold">导出数据</h2>
      <p class="text-sm text-on-surface-secondary">
        将所有数据导出为文件，便于备份和迁移。
      </p>
      <div class="flex flex-wrap gap-3">
        <button class="btn-primary btn-sm" @click="handleExport('json')">
          导出 JSON
        </button>
        <button class="btn-secondary btn-sm" @click="handleExport('csv')">
          导出 CSV
        </button>
      </div>
    </div>

    <!-- Import -->
    <div class="card space-y-3">
      <h2 class="font-bold">导入数据</h2>
      <div class="space-y-2 text-sm text-on-surface-secondary">
        <p>
          合并：保留当前数据，只补充导入文件里的内容。分类会按“名称 + 类型 +
          父级”复用；新增记录遇到 ID 冲突时会自动重新分配，不会覆盖现有数据。
        </p>
        <p>
          覆盖：先清空当前分类、账目、周期规则和设置，再按导入文件完整恢复。适合整本账本迁移，执行前请先导出备份。
        </p>
      </div>
      <div>
        <label class="label">导入模式</label>
        <select v-model="importMode" class="select w-full sm:w-40">
          <option value="merge">合并（推荐）</option>
          <option value="overwrite">覆盖当前数据</option>
        </select>
      </div>
      <div>
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          class="hidden"
          @change="handleFileSelect"
        />
        <button
          class="btn-primary btn-sm"
          @click="$refs.fileInput.click()"
          :disabled="importing"
        >
          {{ importing ? '导入中...' : '选择 JSON 文件导入' }}
        </button>
      </div>
    </div>

    <!-- Import result -->
    <div v-if="importResult" class="card">
      <h2 class="font-bold mb-2">导入结果</h2>
      <div class="space-y-1 text-sm">
        <p>分类: +{{ importResult.categories }}</p>
        <p>交易: +{{ importResult.transactions }}</p>
        <p>周期规则: +{{ importResult.recurring_rules }}</p>
        <p>设置: {{ importResult.settings }} 项</p>
        <div v-if="importResult.errors?.length" class="mt-2">
          <p class="text-red-500 font-medium">
            错误 ({{ importResult.errors.length }}):
          </p>
          <ul
            class="list-disc pl-5 text-red-500 max-h-40 overflow-y-auto scrollbar-thin custom-scroll"
          >
            <li v-for="(err, i) in importResult.errors" :key="i">{{ err }}</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Batch import transactions -->
    <div class="card space-y-3">
      <h2 class="font-bold">批量导入账目</h2>
      <p class="text-sm text-on-surface-secondary">
        通过 JSON 文件或粘贴 JSON 批量导入账目记录。可使用分类
        ID（推荐）或分类名称匹配。
      </p>
      <div class="flex flex-wrap gap-3">
        <button class="btn-secondary btn-sm" @click="downloadTemplate">
          下载模板
        </button>
        <button class="btn-secondary btn-sm" @click="downloadCategories">
          导出分类信息
        </button>
      </div>
      <div class="flex flex-wrap gap-3">
        <div>
          <input
            ref="batchFileInput"
            type="file"
            accept=".json"
            class="hidden"
            @change="handleBatchFileSelect"
          />
          <button
            class="btn-primary btn-sm"
            @click="triggerBatchFileInput"
            :disabled="batchImporting"
          >
            {{ batchImporting ? '导入中...' : '选择文件导入' }}
          </button>
        </div>
        <button
          class="btn-primary btn-sm"
          :disabled="batchImporting"
          @click="togglePasteInput"
        >
          粘贴 JSON 导入
        </button>
      </div>
      <div v-if="showPasteInput" class="space-y-2">
        <textarea
          v-model="pasteJsonText"
          class="input w-full font-mono text-xs scrollbar-thin custom-scroll"
          rows="6"
          placeholder="粘贴 JSON 内容，格式参考下载的模板..."
        ></textarea>
        <button
          class="btn-primary btn-sm"
          :disabled="!pasteJsonText.trim() || batchImporting"
          @click="handlePasteImport"
        >
          解析并预览
        </button>
      </div>
    </div>

    <!-- Batch import result -->
    <div v-if="batchImportResult" class="card">
      <h2 class="font-bold mb-2">批量导入结果</h2>
      <div class="space-y-1 text-sm">
        <p
          v-if="batchImportResult.success"
          class="text-emerald-500 font-medium"
        >
          成功导入 {{ batchImportResult.imported }} 条账目
        </p>
        <div v-if="batchImportResult.errors?.length" class="mt-2">
          <p class="text-red-500 font-medium">
            错误 ({{ batchImportResult.errors.length }}):
          </p>
          <ul
            class="list-disc pl-5 text-red-500 max-h-40 overflow-y-auto scrollbar-thin custom-scroll"
          >
            <li v-for="(err, i) in batchImportResult.errors" :key="i">
              {{ err }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Danger zone -->
    <div class="card border-red-200 dark:border-red-900/50 space-y-3">
      <h2 class="font-bold text-red-500">危险操作</h2>
      <p class="text-sm text-on-surface-secondary">
        以下操作不可撤销，请先导出备份。
      </p>
      <p class="text-xs text-on-surface-secondary">
        如需清空数据，请手动删除数据库文件 (默认路径: data/bookkeeping.db)
        并重启服务。
      </p>
    </div>

    <ConfirmDialog
      :show="showImportConfirm"
      title="确认导入"
      :message="
        importMode === 'merge'
          ? `确定以“合并”模式导入「${pendingFile?.name}」吗？当前数据会保留，新增记录会自动避开重复 ID。`
          : `确定以“覆盖”模式导入「${pendingFile?.name}」吗？当前分类、账目、周期规则和设置会被清空并替换，此操作不可撤销。`
      "
      confirm-text="确认导入"
      @confirm="confirmImport"
      @cancel="cancelImport"
    />
    <BatchImportPreview
      :show="showBatchPreview"
      :transactions="batchParsedTransactions"
      :errors="batchValidationErrors"
      :categories="categoriesStore.flatList"
      :category-tree="categoriesStore.tree"
      :currencies="settingsStore.currencies"
      :week-start="Number(settingsStore.settings.week_start) || 1"
      @confirm="handleBatchPreviewConfirm"
      @cancel="cancelBatchImport"
    />

    <ConfirmDialog
      :show="showBatchFinalConfirm"
      title="二次确认"
      :message="`即将导入 ${batchPendingPayload?.transactions?.length || 0} 条账目，导入后不可批量撤销，确定继续？`"
      confirm-text="确认导入"
      @confirm="executeBatchImport"
      @cancel="showBatchFinalConfirm = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api/client.js'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import BatchImportPreview from '../components/BatchImportPreview.vue'
import { useSettingsStore } from '../stores/settings.js'
import { useCategoriesStore } from '../stores/categories.js'
import { useToastStore } from '../stores/toast.js'

const settingsStore = useSettingsStore()
const categoriesStore = useCategoriesStore()
const toast = useToastStore()
const importMode = ref('merge')
const importing = ref(false)
const importResult = ref(null)
const showImportConfirm = ref(false)
const pendingFile = ref(null)
const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024

const batchFileInput = ref(null)
const batchImporting = ref(false)
const batchImportResult = ref(null)
const showBatchPreview = ref(false)
const showBatchFinalConfirm = ref(false)
const batchParsedTransactions = ref([])
const batchValidationErrors = ref([])
const batchPendingPayload = ref(null)
const showPasteInput = ref(false)
const pasteJsonText = ref('')

onMounted(() => {
  categoriesStore.fetch()
})

async function handleExport(format) {
  try {
    await api.download(`/data/export?format=${format}`)
    toast.success('导出成功')
  } catch (e) {
    toast.error('导出失败: ' + e.message)
  }
}

async function handleFileSelect(e) {
  const file = e.target.files?.[0]
  if (!file) return

  if (!file.name.toLowerCase().endsWith('.json')) {
    toast.error('只能导入 JSON 文件')
    pendingFile.value = null
    e.target.value = ''
    return
  }

  if (file.size > MAX_IMPORT_FILE_SIZE) {
    toast.error('文件过大，请控制在 2MB 以内')
    pendingFile.value = null
    e.target.value = ''
    return
  }

  pendingFile.value = file
  showImportConfirm.value = true
  e.target.value = ''
}

async function confirmImport() {
  showImportConfirm.value = false
  const file = pendingFile.value
  if (!file) return

  importing.value = true
  importResult.value = null

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    importResult.value = await api.post(
      `/data/import?mode=${importMode.value}`,
      data
    )
    await settingsStore.fetch()
    toast.success(
      importMode.value === 'merge' ? '合并导入完成' : '覆盖导入完成'
    )
  } catch (e) {
    toast.error('导入失败: ' + e.message)
  } finally {
    importing.value = false
    pendingFile.value = null
  }
}

function cancelImport() {
  showImportConfirm.value = false
  pendingFile.value = null
}

function downloadTemplate() {
  const template = {
    _说明: {
      category_id: '分类 ID（优先使用，可通过"导出分类信息"查看）',
      category_name: '分类名称（当未填 category_id 时使用）',
      parent_category_name:
        '父分类名称（当用名称匹配且存在同名子分类时用于区分）',
      type: '必填，income（收入）或 expense（支出）',
      amount: '必填，金额，必须大于 0',
      currency: '选填，币种代码如 CNY、USD，默认为系统设置的默认币种',
      date: '必填，日期，格式 YYYY-MM-DD',
      note: '选填，备注信息'
    },
    transactions: [
      {
        type: 'expense',
        category_id: 1,
        category_name: '',
        parent_category_name: '',
        amount: 25.5,
        currency: 'CNY',
        date: '2024-01-15',
        note: '备注信息'
      },
      {
        type: 'income',
        category_id: null,
        category_name: '分类名称',
        parent_category_name: '',
        amount: 5000.0,
        currency: 'CNY',
        date: '2024-01-01',
        note: '备注信息'
      }
    ]
  }
  const blob = new Blob([JSON.stringify(template, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'batch_import_template.json'
  a.click()
  URL.revokeObjectURL(url)
}

function downloadCategories() {
  const tree = categoriesStore.tree
  const list = []
  for (const parent of tree) {
    list.push({
      id: parent.id,
      name: parent.name,
      type: parent.type,
      parent_id: null,
      parent_name: null
    })
    if (parent.children) {
      for (const child of parent.children) {
        list.push({
          id: child.id,
          name: child.name,
          type: child.type,
          parent_id: parent.id,
          parent_name: parent.name
        })
      }
    }
  }
  const blob = new Blob([JSON.stringify(list, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'categories.json'
  a.click()
  URL.revokeObjectURL(url)
}

function triggerBatchFileInput() {
  batchFileInput.value?.click()
}

function togglePasteInput() {
  showPasteInput.value = !showPasteInput.value
}

function handlePasteImport() {
  const text = pasteJsonText.value.trim()
  if (!text) return

  batchImportResult.value = null
  parseBatchFile(text)
}

function handleBatchFileSelect(e) {
  const file = e.target.files?.[0]
  if (!file) return
  e.target.value = ''

  if (!file.name.toLowerCase().endsWith('.json')) {
    toast.error('只能导入 JSON 文件')
    return
  }

  if (file.size > MAX_IMPORT_FILE_SIZE) {
    toast.error('文件过大，请控制在 2MB 以内')
    return
  }

  batchImportResult.value = null

  file
    .text()
    .then(text => {
      parseBatchFile(text)
    })
    .catch(() => {
      toast.error('文件读取失败')
    })
}

function parseBatchFile(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    toast.error('JSON 格式不正确')
    return
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    toast.error('JSON 格式不正确，需要包含 transactions 数组')
    return
  }

  const transactions = data.transactions
  if (!Array.isArray(transactions) || transactions.length === 0) {
    toast.error('transactions 必须是非空数组')
    return
  }

  if (transactions.length > 20000) {
    toast.error('账目数量超过限制（最大 20000 条）')
    return
  }

  const errors = validateBatchTransactions(transactions)

  batchParsedTransactions.value = transactions
  batchValidationErrors.value = errors
  batchPendingPayload.value = data
  showBatchPreview.value = true
}

function validateBatchTransactions(transactions) {
  const errors = []
  const flatCategories = categoriesStore.flatList
  const dateReg = /^\d{4}-\d{2}-\d{2}$/

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i]
    const idx = i + 1

    if (!t || typeof t !== 'object' || Array.isArray(t)) {
      errors.push(`第 ${idx} 条：格式无效`)
      continue
    }

    const type = String(t.type || '').trim()
    if (type !== 'income' && type !== 'expense') {
      errors.push(`第 ${idx} 条：type 必须是 income 或 expense`)
    }

    const amount = Number(t.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(`第 ${idx} 条：amount 必须大于 0`)
    }

    const date = String(t.date || '').trim()
    if (!dateReg.test(date)) {
      errors.push(`第 ${idx} 条：date 格式应为 YYYY-MM-DD`)
    }

    const categoryName = String(t.category_name || '').trim()
    const categoryId =
      t.category_id != null && t.category_id !== ''
        ? Number(t.category_id)
        : null

    if (!categoryId && !categoryName) {
      errors.push(`第 ${idx} 条：category_id 和 category_name 至少填一个`)
    } else if (categoryId) {
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        errors.push(`第 ${idx} 条：category_id 必须是正整数`)
      } else {
        const cat = flatCategories.find(c => c.id === categoryId)
        if (!cat) {
          errors.push(`第 ${idx} 条：找不到 ID 为 ${categoryId} 的分类`)
        } else if (cat.type !== type) {
          errors.push(
            `第 ${idx} 条：分类 "${cat.name}"(ID:${categoryId}) 类型为 ${cat.type}，与账目类型 ${type} 不一致`
          )
        }
      }
    } else if (type === 'income' || type === 'expense') {
      const parentCategoryName = String(t.parent_category_name || '').trim()
      const resolved = resolveCategory(
        categoryName,
        parentCategoryName,
        type,
        flatCategories
      )
      if (resolved.error) {
        errors.push(`第 ${idx} 条：${resolved.error}`)
      }
    }
  }

  return errors
}

function resolveCategory(
  categoryName,
  parentCategoryName,
  type,
  flatCategories
) {
  if (parentCategoryName) {
    const parent = flatCategories.find(
      c => c.name === parentCategoryName && c.type === type && !c.parent_id
    )
    if (!parent) {
      return {
        error: `找不到${type === 'income' ? '收入' : '支出'}父分类 "${parentCategoryName}"`
      }
    }
    const child = flatCategories.find(
      c =>
        c.name === categoryName && c.type === type && c.parent_id === parent.id
    )
    if (!child) {
      return {
        error: `在 "${parentCategoryName}" 下找不到子分类 "${categoryName}"`
      }
    }
    return { id: child.id }
  }

  const candidates = flatCategories.filter(
    c => c.name === categoryName && c.type === type
  )
  if (candidates.length === 0) {
    return {
      error: `找不到${type === 'income' ? '收入' : '支出'}分类 "${categoryName}"`
    }
  }
  if (candidates.length > 1) {
    return {
      error: `存在多个同名分类 "${categoryName}"，请指定 parent_category_name`
    }
  }
  return { id: candidates[0].id }
}

function handleBatchPreviewConfirm(selectedTransactions) {
  showBatchPreview.value = false
  batchPendingPayload.value = { transactions: selectedTransactions }
  batchParsedTransactions.value = selectedTransactions
  showBatchFinalConfirm.value = true
}

async function executeBatchImport() {
  showBatchFinalConfirm.value = false
  const payload = batchPendingPayload.value
  if (!payload) return

  batchImporting.value = true
  batchImportResult.value = null

  try {
    const result = await api.post('/data/batch-import-transactions', payload)
    batchImportResult.value = result
    if (result.success) {
      toast.success(`成功导入 ${result.imported} 条账目`)
    } else {
      toast.error('导入失败，请查看错误详情')
    }
    await settingsStore.fetchUsedCurrencies()
  } catch (e) {
    toast.error('导入失败: ' + e.message)
  } finally {
    batchImporting.value = false
    batchPendingPayload.value = null
  }
}

function cancelBatchImport() {
  showBatchPreview.value = false
  batchParsedTransactions.value = []
  batchValidationErrors.value = []
  batchPendingPayload.value = null
}
</script>

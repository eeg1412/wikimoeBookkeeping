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
      <p class="text-sm text-on-surface-secondary">
        从 JSON 文件导入数据。合并模式下，同名同类型分类将复用，交易数据将追加。
      </p>
      <div>
        <label class="label">导入模式</label>
        <select v-model="importMode" class="select w-full sm:w-40">
          <option value="merge">合并（推荐）</option>
          <option value="append">全部追加</option>
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
          <ul class="list-disc pl-5 text-red-500 max-h-40 overflow-y-auto">
            <li v-for="(err, i) in importResult.errors" :key="i">{{ err }}</li>
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

    <p
      v-if="msg"
      class="text-sm text-center"
      :class="msgIsErr ? 'text-red-500' : 'text-emerald-500'"
    >
      {{ msg }}
    </p>

    <ConfirmDialog
      :show="showImportConfirm"
      title="确认导入"
      :message="`确定要导入文件「${pendingFile?.name}」吗？模式：${importMode === 'merge' ? '合并' : '全部追加'}。此操作可能会修改现有数据。`"
      confirm-text="确认导入"
      @confirm="confirmImport"
      @cancel="cancelImport"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { api } from '../api/client.js'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const importMode = ref('merge')
const importing = ref(false)
const importResult = ref(null)
const msg = ref('')
const msgIsErr = ref(false)
const showImportConfirm = ref(false)
const pendingFile = ref(null)
const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024

async function handleExport(format) {
  try {
    await api.download(`/data/export?format=${format}`)
    msg.value = '导出成功'
    msgIsErr.value = false
  } catch (e) {
    msg.value = '导出失败: ' + e.message
    msgIsErr.value = true
  }
}

async function handleFileSelect(e) {
  const file = e.target.files?.[0]
  if (!file) return

  if (!file.name.toLowerCase().endsWith('.json')) {
    msg.value = '只能导入 JSON 文件'
    msgIsErr.value = true
    pendingFile.value = null
    e.target.value = ''
    return
  }

  if (file.size > MAX_IMPORT_FILE_SIZE) {
    msg.value = '文件过大，请控制在 2MB 以内'
    msgIsErr.value = true
    pendingFile.value = null
    e.target.value = ''
    return
  }

  pendingFile.value = file
  msg.value = ''
  msgIsErr.value = false
  showImportConfirm.value = true
  e.target.value = ''
}

async function confirmImport() {
  showImportConfirm.value = false
  const file = pendingFile.value
  if (!file) return

  importing.value = true
  msg.value = ''
  importResult.value = null

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    importResult.value = await api.post(
      `/data/import?mode=${importMode.value}`,
      data
    )
    msg.value = '导入完成'
    msgIsErr.value = false
  } catch (e) {
    msg.value = '导入失败: ' + e.message
    msgIsErr.value = true
  } finally {
    importing.value = false
    pendingFile.value = null
  }
}

function cancelImport() {
  showImportConfirm.value = false
  pendingFile.value = null
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="page-title">登录日志</h1>

    <div v-if="loading" class="text-center py-12 text-on-surface-secondary">
      加载中...
    </div>
    <div
      v-else-if="!list.length"
      class="text-center py-12 text-on-surface-secondary"
    >
      暂无记录
    </div>
    <div v-else class="card !p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-surface-secondary/50">
              <th
                class="text-left px-4 py-2.5 font-medium text-on-surface-secondary"
              >
                时间
              </th>
              <th
                class="text-left px-4 py-2.5 font-medium text-on-surface-secondary"
              >
                IP
              </th>
              <th
                class="text-left px-4 py-2.5 font-medium text-on-surface-secondary"
              >
                用户名
              </th>
              <th
                class="text-left px-4 py-2.5 font-medium text-on-surface-secondary"
              >
                结果
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in list"
              :key="item.id"
              class="border-b border-border last:border-0"
            >
              <td class="px-4 py-2.5 text-on-surface whitespace-nowrap">
                {{ item.created_at_local }}
              </td>
              <td class="px-4 py-2.5 text-on-surface font-mono text-xs">
                {{ item.ip }}
              </td>
              <td class="px-4 py-2.5 text-on-surface">
                {{ item.username || '-' }}
              </td>
              <td class="px-4 py-2.5">
                <span
                  class="badge text-xs"
                  :class="
                    item.success
                      ? 'badge-income'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                  "
                >
                  {{ item.success ? '成功' : '失败' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="total > pageSize" class="flex justify-center gap-2 pt-2">
      <button
        class="btn-secondary btn-sm"
        :disabled="page <= 1"
        @click="changePage(page - 1)"
      >
        上一页
      </button>
      <span class="text-sm text-on-surface-secondary self-center">
        {{ page }} / {{ Math.ceil(total / pageSize) }}
      </span>
      <button
        class="btn-secondary btn-sm"
        :disabled="page >= Math.ceil(total / pageSize)"
        @click="changePage(page + 1)"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, toRefs } from 'vue'
import { api } from '../api/client.js'
import { useCachedViewState } from '../composables/useCachedViewState.js'

const LOGIN_ATTEMPTS_STATE_KEY = 'login-attempts:list'

const { state: listState } = useCachedViewState(LOGIN_ATTEMPTS_STATE_KEY, {
  page: 1
})
const { page } = toRefs(listState)

const list = ref([])
const total = ref(0)
const pageSize = ref(20)
const loading = ref(false)
const browserDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
})

function formatLoginAttemptTime(value) {
  if (!value) {
    return '-'
  }

  const rawValue = String(value).trim()
  const sqliteDateTimeMatch = rawValue.match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
  )

  let date = null

  if (sqliteDateTimeMatch) {
    const [, year, month, day, hour, minute, second] = sqliteDateTimeMatch
    date = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
      )
    )
  } else {
    date = new Date(rawValue)
  }

  if (Number.isNaN(date.getTime())) {
    return rawValue
  }

  return browserDateTimeFormatter.format(date)
}

async function fetchAttempts() {
  loading.value = true
  try {
    const data = await api.get(
      `/auth/login-attempts?page=${page.value}&pageSize=${pageSize.value}`
    )
    list.value = data.list.map(item => ({
      ...item,
      created_at_local: formatLoginAttemptTime(item.created_at)
    }))
    total.value = data.total
    page.value = data.page
    pageSize.value = data.pageSize
  } finally {
    loading.value = false
  }
}

function changePage(p) {
  page.value = p
  fetchAttempts()
}

onMounted(fetchAttempts)
</script>

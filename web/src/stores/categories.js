import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api/client.js'

export const useCategoriesStore = defineStore('categories', () => {
  const tree = ref([])
  const loading = ref(false)
  const migrationBusy = ref(false)

  const flatList = computed(() => {
    const list = []
    for (const parent of tree.value) {
      list.push(parent)
      if (parent.children) {
        for (const child of parent.children) {
          list.push(child)
        }
      }
    }
    return list
  })

  const incomeTree = computed(() => tree.value.filter(c => c.type === 'income'))

  const expenseTree = computed(() =>
    tree.value.filter(c => c.type === 'expense')
  )

  async function fetch() {
    loading.value = true
    try {
      tree.value = await api.get('/categories')
    } finally {
      loading.value = false
    }
  }

  async function create(data) {
    const result = await api.post('/categories', data)
    await fetch()
    return result
  }

  async function update(id, data) {
    const result = await api.put(`/categories/${id}`, data)
    await fetch()
    return result
  }

  async function remove(id) {
    await api.delete(`/categories/${id}`)
    await fetch()
  }

  async function getDeletePlan(id) {
    return api.get(`/categories/${id}/delete-plan`)
  }

  async function migrateAndDelete(id, targetCategoryId) {
    migrationBusy.value = true

    try {
      const result = await api.post(`/categories/${id}/migrate-and-delete`, {
        target_category_id: targetCategoryId
      })
      await fetch()
      return result
    } finally {
      migrationBusy.value = false
    }
  }

  return {
    tree,
    flatList,
    incomeTree,
    expenseTree,
    loading,
    migrationBusy,
    fetch,
    create,
    update,
    remove,
    getDeletePlan,
    migrateAndDelete
  }
})

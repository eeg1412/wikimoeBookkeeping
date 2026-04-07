import * as service from './service.js'
import { json, error, created } from '../../utils/response.js'

export function registerCategoryRoutes(router) {
  router.get('/api/categories', (req, res) => {
    try {
      json(res, service.listCategories())
    } catch (e) {
      error(res, e.message)
    }
  })

  router.post('/api/categories', (req, res) => {
    try {
      const { name, type, parent_id, icon, color, sort_order } = req.body
      if (!name || !type) return error(res, '名称和类型不能为空')
      if (!['income', 'expense'].includes(type)) return error(res, '类型无效')
      const data = service.createCategory({
        name,
        type,
        parent_id,
        icon,
        color,
        sort_order
      })
      created(res, data)
    } catch (e) {
      error(res, e.message)
    }
  })

  router.put('/api/categories/:id', (req, res) => {
    try {
      const data = service.updateCategory(Number(req.params.id), req.body)
      json(res, data)
    } catch (e) {
      error(res, e.message)
    }
  })

  router.delete('/api/categories/:id', (req, res) => {
    try {
      service.deleteCategory(Number(req.params.id))
      json(res, { success: true })
    } catch (e) {
      error(res, e.message)
    }
  })
}

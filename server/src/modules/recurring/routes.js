import * as service from './service.js'
import { json, error, created } from '../../utils/response.js'

export function registerRecurringRoutes(router) {
  router.get('/api/recurring', (req, res) => {
    try {
      json(res, service.listRules())
    } catch (e) {
      error(res, e.message)
    }
  })

  router.post('/api/recurring', (req, res) => {
    try {
      const { name, type, amount, category_id, frequency, start_date } =
        req.body
      if (
        !name ||
        !type ||
        !amount ||
        !category_id ||
        !frequency ||
        !start_date
      ) {
        return error(res, '缺少必填字段')
      }
      if (!['income', 'expense'].includes(type)) return error(res, '类型无效')
      if (!['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
        return error(res, '频率无效')
      }
      const data = service.createRule(req.body)
      created(res, data)
    } catch (e) {
      error(res, e.message)
    }
  })

  router.put('/api/recurring/:id', (req, res) => {
    try {
      const data = service.updateRule(Number(req.params.id), req.body)
      json(res, data)
    } catch (e) {
      error(res, e.message)
    }
  })

  router.delete('/api/recurring/:id', (req, res) => {
    try {
      service.deleteRule(Number(req.params.id))
      json(res, { success: true })
    } catch (e) {
      error(res, e.message)
    }
  })

  router.get('/api/recurring/:id/logs', (req, res) => {
    try {
      const { page, pageSize } = req.query
      const data = service.getRuleLogs(Number(req.params.id), {
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 20
      })
      json(res, data)
    } catch (e) {
      error(res, e.message)
    }
  })
}

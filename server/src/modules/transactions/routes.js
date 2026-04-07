import * as service from './service.js'
import { json, error, created } from '../../utils/response.js'

export function registerTransactionRoutes(router) {
  router.get('/api/transactions', (req, res) => {
    try {
      const {
        page,
        pageSize,
        type,
        category_id,
        date_from,
        date_to,
        currency
      } = req.query
      const data = service.listTransactions({
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 20,
        type,
        category_id: category_id ? Number(category_id) : undefined,
        date_from,
        date_to,
        currency
      })
      json(res, data)
    } catch (e) {
      error(res, e.message)
    }
  })

  router.post('/api/transactions', (req, res) => {
    try {
      const { type, amount, currency, category_id, note, date } = req.body
      if (!type || !amount || !category_id || !date) {
        return error(res, '缺少必填字段')
      }
      if (!['income', 'expense'].includes(type)) {
        return error(res, '类型无效')
      }
      if (Number(amount) <= 0) return error(res, '金额必须大于0')
      const data = service.createTransaction({
        type,
        amount: Number(amount),
        currency,
        category_id: Number(category_id),
        note,
        date
      })
      created(res, data)
    } catch (e) {
      error(res, e.message)
    }
  })

  router.get('/api/transactions/:id', (req, res) => {
    try {
      const data = service.getTransaction(Number(req.params.id))
      if (!data) {
        return error(res, '账目不存在')
      }

      json(res, data)
    } catch (e) {
      error(res, e.message)
    }
  })

  router.put('/api/transactions/:id', (req, res) => {
    try {
      const data = service.updateTransaction(Number(req.params.id), req.body)
      json(res, data)
    } catch (e) {
      error(res, e.message)
    }
  })

  router.delete('/api/transactions/:id', (req, res) => {
    try {
      service.deleteTransaction(Number(req.params.id))
      json(res, { success: true })
    } catch (e) {
      error(res, e.message)
    }
  })
}

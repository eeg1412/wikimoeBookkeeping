import * as service from './service.js'
import { json, error } from '../../utils/response.js'

export function registerReportRoutes(router) {
  router.get('/api/reports/summary', (req, res) => {
    try {
      const { period, date, currency } = req.query
      if (!period) return error(res, '请指定统计周期')
      json(res, service.getSummary({ period, date, currency }))
    } catch (e) {
      error(res, e.message)
    }
  })

  router.get('/api/reports/trend', (req, res) => {
    try {
      const { period, start_date, end_date, type, currency } = req.query
      if (!period || !start_date || !end_date) return error(res, '缺少必要参数')
      json(
        res,
        service.getTrend({ period, start_date, end_date, type, currency })
      )
    } catch (e) {
      error(res, e.message)
    }
  })

  router.get('/api/reports/category', (req, res) => {
    try {
      const { period, date, type, currency } = req.query
      if (!period) return error(res, '请指定统计周期')
      json(res, service.getCategoryReport({ period, date, type, currency }))
    } catch (e) {
      error(res, e.message)
    }
  })
}

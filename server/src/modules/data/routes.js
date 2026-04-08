import * as service from './service.js'
import { json, error } from '../../utils/response.js'

export function registerDataRoutes(router) {
  router.get('/api/data/export', (req, res) => {
    try {
      const { format } = req.query
      if (format === 'csv') {
        const csv = service.exportCSV()
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename=bookkeeping_export.csv'
        })
        res.end('\ufeff' + csv)
      } else {
        const data = service.exportData()
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename=bookkeeping_export.json'
        })
        res.end(JSON.stringify(data, null, 2))
      }
    } catch (e) {
      error(res, e.message)
    }
  })

  router.post('/api/data/import', (req, res) => {
    try {
      const { mode } = req.query
      const result = service.importData(req.body, mode || 'merge')
      json(res, result)
    } catch (e) {
      error(res, e.message)
    }
  })

  router.post('/api/data/batch-import-transactions', (req, res) => {
    try {
      const result = service.batchImportTransactions(req.body)
      json(res, result)
    } catch (e) {
      error(res, e.message)
    }
  })
}

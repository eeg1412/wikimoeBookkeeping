import * as service from './service.js'
import { json, error } from '../../utils/response.js'

export function registerSettingsRoutes(router) {
  router.get('/api/settings', (req, res) => {
    try {
      json(res, service.getSettings())
    } catch (e) {
      error(res, e.message)
    }
  })

  router.put('/api/settings', (req, res) => {
    try {
      json(res, service.updateSettings(req.body))
    } catch (e) {
      error(res, e.message)
    }
  })

  router.get('/api/currencies', (req, res) => {
    json(res, service.getCurrencies())
  })

  router.get('/api/icons', (req, res) => {
    json(res, service.getCategoryIcons())
  })
}

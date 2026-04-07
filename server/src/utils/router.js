export class Router {
  constructor() {
    this.routes = []
    this.globalMiddlewares = []
  }

  use(fn) {
    this.globalMiddlewares.push(fn)
    return this
  }

  get(path, ...handlers) {
    this.routes.push({ method: 'GET', path, handlers })
    return this
  }
  post(path, ...handlers) {
    this.routes.push({ method: 'POST', path, handlers })
    return this
  }
  put(path, ...handlers) {
    this.routes.push({ method: 'PUT', path, handlers })
    return this
  }
  delete(path, ...handlers) {
    this.routes.push({ method: 'DELETE', path, handlers })
    return this
  }

  _matchPath(pattern, pathname) {
    const patternParts = pattern.split('/').filter(Boolean)
    const pathParts = pathname.split('/').filter(Boolean)
    if (patternParts.length !== pathParts.length) return null
    const params = {}
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i])
      } else if (patternParts[i] !== pathParts[i]) {
        return null
      }
    }
    return params
  }

  _matchRoute(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method) continue
      const params = this._matchPath(route.path, pathname)
      if (params !== null) return { route, params }
    }
    return null
  }

  async handle(req, res) {
    const urlObj = new URL(req.url, 'http://localhost')
    req.pathname = urlObj.pathname
    req.query = Object.fromEntries(urlObj.searchParams)
    req.params = {}

    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      try {
        req.body = await this._parseBody(req)
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ code: 1, message: '请求体解析失败' }))
        return true
      }
    }

    for (const mw of this.globalMiddlewares) {
      let called = false
      await mw(req, res, () => {
        called = true
      })
      if (!called) return true
    }

    const match = this._matchRoute(req.method, req.pathname)
    if (!match) return false

    req.params = match.params
    const handlers = match.route.handlers
    for (let i = 0; i < handlers.length; i++) {
      let called = false
      await handlers[i](req, res, () => {
        called = true
      })
      if (!called) break
    }
    return true
  }

  _parseBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = []
      let size = 0
      const maxSize = 10 * 1024 * 1024
      req.on('data', chunk => {
        size += chunk.length
        if (size > maxSize) {
          reject(new Error('Body too large'))
          req.destroy()
          return
        }
        chunks.push(chunk)
      })
      req.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8')
        if (!raw) return resolve({})
        try {
          resolve(JSON.parse(raw))
        } catch {
          reject(new Error('Invalid JSON'))
        }
      })
      req.on('error', reject)
    })
  }
}

export function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  })
  res.end(JSON.stringify({ code: 0, data }))
}

export function error(res, message, status = 400) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  })
  res.end(JSON.stringify({ code: 1, message }))
}

export function created(res, data) {
  json(res, data, 201)
}

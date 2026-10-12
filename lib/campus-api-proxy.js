const UPSTREAM_ORIGIN = 'https://student-emergency-information-service.ank260610.workers.dev'

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  })
  response.end(body)
}

function requestBody(request) {
  if (request.body === undefined || request.body === null) return undefined
  return typeof request.body === 'string' || Buffer.isBuffer(request.body)
    ? request.body
    : JSON.stringify(request.body)
}

function createCampusProxy(upstreamPath) {
  return async function handler(request, response) {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Cache-Control': 'no-store',
      })
      response.end()
      return
    }

    try {
      const query = new URL(request.url, 'https://compatibility.local').search
      const upstream = await fetch(`${UPSTREAM_ORIGIN}${upstreamPath}${query}`, {
        method: request.method,
        headers: request.headers['content-type']
          ? { 'Content-Type': request.headers['content-type'] }
          : undefined,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : requestBody(request),
        signal: AbortSignal.timeout(55_000),
      })
      const body = await upstream.text()
      return send(response, upstream.status, body, {
        'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      })
    } catch {
      return send(response, 502, JSON.stringify({ error: '校园服务暂时无法响应，请稍后再试。' }))
    }
  }
}

module.exports = { createCampusProxy }

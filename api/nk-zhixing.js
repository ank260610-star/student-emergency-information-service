const { randomUUID } = require('node:crypto')

// Includes the browser's 500-character input plus campus/location/history context.
// Keep this aligned with frontend/worker/services.js.
const MAX_AGENT_MESSAGE_LENGTH = 8_000
const MAX_BODY_BYTES = 64 * 1024
const CREATE_TIMEOUT_MS = 10_000
const ANSWER_TIMEOUT_MS = 45_000

function responseHeaders(request) {
  const origin = request.headers.origin
  const allowedOrigins = new Set((process.env.NK_ZHIXING_ALLOWED_ORIGINS || '')
    .split(',').map((item) => item.trim()).filter(Boolean))
  const headers = {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Origin',
  }
  if (origin && allowedOrigins.has(origin)) headers['Access-Control-Allow-Origin'] = origin
  return headers
}

function send(response, request, status, payload, extraHeaders = {}) {
  response.writeHead(status, { ...responseHeaders(request), ...extraHeaders })
  response.end(JSON.stringify(payload))
}

function bodyTooLarge() {
  const error = new Error('Request body too large')
  error.statusCode = 413
  return error
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    let bytes = 0
    let exceeded = false
    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      if (exceeded) return
      bytes += Buffer.byteLength(chunk, 'utf8')
      if (bytes > MAX_BODY_BYTES) {
        exceeded = true
        body = ''
        reject(bodyTooLarge())
        return
      }
      body += chunk
    })
    request.on('end', () => resolve(body))
    request.on('error', reject)
    request.on('aborted', () => reject(new Error('Request aborted')))
  })
}

async function readPayload(request) {
  // Vercel can supply an already parsed body; raw Node requests remain supported.
  const body = request.body === undefined ? await readBody(request) : request.body
  const text = typeof body === 'string' || Buffer.isBuffer(body) ? body.toString() : JSON.stringify(body)
  if (Buffer.byteLength(text || '', 'utf8') > MAX_BODY_BYTES) throw bodyTooLarge()
  return JSON.parse(text)
}

function parseAgentPayload(text) {
  try {
    return JSON.parse(text)
  } catch {
    // Some deployments return SSE frames even when blocking mode is requested.
    for (const line of text.split('\n').reverse()) {
      if (!line.startsWith('data:')) continue
      try {
        const payload = JSON.parse(line.slice(5).trim())
        if (payload?.answer || payload?.data?.answer) return payload
      } catch {
        // Ignore stream markers and incomplete frames.
      }
    }
    return null
  }
}

async function callAgent(url, headers, body, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    // Keep the deadline active while the upstream response body is being read.
    return { response, payload: parseAgentPayload(await response.text()) }
  } finally {
    clearTimeout(timer)
  }
}

module.exports = async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      ...responseHeaders(request),
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    })
    response.end()
    return
  }
  if (request.method !== 'POST') {
    return send(response, request, 405, { error: 'Method not allowed' }, { Allow: 'POST, OPTIONS' })
  }
  if (!process.env.NK_GENIOS_AGENT_API_URL || !process.env.NK_GENIOS_AGENT_TOKEN) {
    return send(response, request, 503, { error: 'NK 智行服务尚未完成配置。' })
  }

  let payload
  try {
    payload = await readPayload(request)
  } catch (error) {
    const tooLarge = error.statusCode === 413
    return send(response, request, tooLarge ? 413 : 400, {
      error: tooLarge ? '请求内容过长，请缩短后重试。' : '请求格式无效。',
    })
  }
  const message = typeof payload?.message === 'string' ? payload.message.trim() : ''
  if (!message || message.length > MAX_AGENT_MESSAGE_LENGTH) {
    return send(response, request, 400, { error: '导航请求为空或附带上下文过长，请缩短后重试。' })
  }

  const baseUrl = process.env.NK_GENIOS_AGENT_API_URL.replace(/\/$/, '')
  const apiKey = process.env.NK_GENIOS_AGENT_TOKEN
  const userId = `nkweb-${randomUUID().replaceAll('-', '').slice(0, 12)}`
  const agentHeaders = { Apikey: apiKey, 'Content-Type': 'application/json' }
  try {
    const created = await callAgent(`${baseUrl}/create_conversation`, agentHeaders, {
      AppKey: apiKey,
      UserID: userId,
    }, CREATE_TIMEOUT_MS)
    const conversation = created.payload?.Conversation?.AppConversationID
    if (!created.response.ok || typeof conversation !== 'string' || !conversation.trim()) {
      return send(response, request, 502, { error: 'NK 智行暂时无法创建会话，请稍后再试。' })
    }
    const answered = await callAgent(`${baseUrl}/chat_query_v2`, agentHeaders, {
      AppKey: apiKey,
      AppConversationID: conversation,
      Query: message,
      ResponseMode: 'blocking',
      UserID: userId,
    }, ANSWER_TIMEOUT_MS)
    const answer = answered.payload?.answer || answered.payload?.data?.answer
    if (!answered.response.ok || typeof answer !== 'string' || !answer.trim()) {
      return send(response, request, 502, { error: 'NK 智行暂时未返回有效回答，请稍后再试。' })
    }
    return send(response, request, 200, { answer })
  } catch {
    return send(response, request, 502, { error: 'NK 智行暂时无法响应，请稍后再试。' })
  }
}

const { randomUUID } = require('node:crypto')

function headers(request) {
  const origin = request.headers.origin
  const allowed = new Set((process.env.NK_ZHIXING_ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()))
  const result = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }
  if (origin && allowed.has(origin)) { result['Access-Control-Allow-Origin'] = origin; result.Vary = 'Origin' }
  return result
}
function send(response, request, status, payload) { response.writeHead(status, headers(request)); response.end(JSON.stringify(payload)) }
function readBody(request) {
  return new Promise((resolve, reject) => { let body = ''; request.setEncoding('utf8'); request.on('data', (chunk) => { body += chunk }); request.on('end', () => resolve(body)); request.on('error', reject) })
}
function parsePayload(text) {
  try { return JSON.parse(text) } catch {
    for (const line of text.split('\n').reverse()) { if (!line.startsWith('data:')) continue; try { const payload = JSON.parse(line.slice(5).trim()); if (payload.answer || payload?.data?.answer) return payload } catch {} }
    return null
  }
}
module.exports = async function handler(request, response) {
  if (request.method === 'OPTIONS') { const result = headers(request); result['Access-Control-Allow-Headers'] = 'Content-Type'; result['Access-Control-Allow-Methods'] = 'POST, OPTIONS'; response.writeHead(204, result); response.end(); return }
  if (request.method !== 'POST') return send(response, request, 405, { error: 'Method not allowed' })
  if (!process.env.NK_GENIOS_AGENT_API_URL || !process.env.NK_GENIOS_AGENT_TOKEN) return send(response, request, 503, { error: 'NK 智行服务尚未完成配置。' })
  let message
  try { message = JSON.parse(await readBody(request)).message?.trim() } catch {}
  if (!message || message.length > 500) return send(response, request, 400, { error: '请输入 1–500 个字的导航需求。' })
  const baseUrl = process.env.NK_GENIOS_AGENT_API_URL.replace(/\/$/, '')
  const apiKey = process.env.NK_GENIOS_AGENT_TOKEN
  const userId = `nkweb-${randomUUID().replaceAll('-', '').slice(0, 12)}`
  const agentHeaders = { Apikey: apiKey, 'Content-Type': 'application/json' }
  try {
    const created = await fetch(`${baseUrl}/create_conversation`, { method: 'POST', headers: agentHeaders, body: JSON.stringify({ AppKey: apiKey, UserID: userId }) })
    const conversation = parsePayload(await created.text())?.Conversation?.AppConversationID
    if (!created.ok || !conversation) return send(response, request, 502, { error: 'NK 智行暂时无法创建会话，请稍后再试。' })
    const answered = await fetch(`${baseUrl}/chat_query_v2`, { method: 'POST', headers: agentHeaders, body: JSON.stringify({ AppKey: apiKey, AppConversationID: conversation, Query: message, ResponseMode: 'blocking', UserID: userId }) })
    const payload = parsePayload(await answered.text())
    const answer = payload?.answer || payload?.data?.answer
    if (!answered.ok || !answer?.trim()) return send(response, request, 502, { error: 'NK 智行暂时未返回有效回答，请稍后再试。' })
    return send(response, request, 200, { answer })
  } catch { return send(response, request, 502, { error: 'NK 智行暂时无法响应，请稍后再试。' }) }
}

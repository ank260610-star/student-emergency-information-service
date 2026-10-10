const assert = require('node:assert/strict')
const { Readable } = require('node:stream')
const test = require('node:test')
const handler = require('../api/nk-zhixing.js')

function configure(t) {
  for (const [key, value] of Object.entries({
    NK_GENIOS_AGENT_API_URL: 'https://agent.example.test/api/',
    NK_GENIOS_AGENT_TOKEN: 'test-token',
    NK_ZHIXING_ALLOWED_ORIGINS: 'https://site.example.test',
  })) {
    const original = process.env[key]
    process.env[key] = value
    t.after(() => {
      if (original === undefined) delete process.env[key]
      else process.env[key] = original
    })
  }
}

async function invoke(body, { raw = false, method = 'POST', origin } = {}) {
  const request = raw ? Readable.from([body]) : { body }
  request.method = method
  request.headers = origin ? { origin } : {}
  const result = {}
  const response = {
    writeHead(status, headers) { Object.assign(result, { status, headers }) },
    end(text) { result.payload = text ? JSON.parse(text) : null },
  }
  await handler(request, response)
  return result
}

test('adapter forwards contextual messages using the existing GenIOS authentication and protocol', async (t) => {
  configure(t)
  const message = '问'.repeat(500) + '\n【当前校区已确定】津南校区'
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) })
    return calls.length === 1
      ? Response.json({ Conversation: { AppConversationID: 'conversation-1' } })
      : Response.json({ data: { answer: '建议先确认终点。' } })
  })
  const result = await invoke({ message })
  assert.equal(result.status, 200)
  assert.deepEqual(result.payload, { answer: '建议先确认终点。' })
  assert.equal(calls[0].url, 'https://agent.example.test/api/create_conversation')
  assert.equal(calls[1].url, 'https://agent.example.test/api/chat_query_v2')
  assert.equal(calls[0].options.headers.Apikey, 'test-token')
  assert.equal(calls[1].body.AppKey, 'test-token')
  assert.equal(calls[1].body.AppConversationID, 'conversation-1')
  assert.equal(calls[1].body.Query, message)
  assert.equal(calls[1].body.ResponseMode, 'blocking')
  assert.equal(calls[0].body.UserID, calls[1].body.UserID)
})

test('adapter supports raw request streams and SSE answers with trailing markers', async (t) => {
  configure(t)
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => ++calls === 1
    ? Response.json({ Conversation: { AppConversationID: 'conversation-2' } })
    : new Response('data: null\ndata: {"answer":"先确认终点。"}\n\ndata: [DONE]\n'))
  const result = await invoke(JSON.stringify({ message: '去图书馆' }), { raw: true })
  assert.equal(result.status, 200)
  assert.equal(result.payload.answer, '先确认终点。')
})

test('invalid, oversized and non-string input fails before any upstream request', async (t) => {
  configure(t)
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected upstream call') })
  for (const body of [null, {}, { message: 42 }, { message: ' ' }, { message: '问'.repeat(8_001) }, '{bad']) {
    assert.equal((await invoke(body)).status, 400)
  }
  assert.equal((await invoke('x'.repeat(65_537), { raw: true })).status, 413)
  assert.equal(fetch.mock.callCount(), 0)
})

test('invalid upstream conversation or answer is returned as a controlled gateway error', async (t) => {
  configure(t)
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ Conversation: { AppConversationID: 42 } }))
  assert.equal((await invoke({ message: '去图书馆' })).status, 502)
  assert.equal(fetch.mock.callCount(), 1)
  let calls = 0
  fetch.mock.mockImplementation(async () => ++calls === 1
    ? Response.json({ Conversation: { AppConversationID: 'conversation-3' } })
    : Response.json({ answer: { unexpected: true } }))
  assert.equal((await invoke({ message: '去图书馆' })).status, 502)
})

test('adapter aborts a conversation response whose body never finishes', async (t) => {
  configure(t)
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let signal
  const fetch = t.mock.method(globalThis, 'fetch', async (_url, options) => {
    signal = options.signal
    return {
      ok: true,
      text: () => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true })
      }),
    }
  })
  const pending = invoke({ message: '去图书馆' })
  await new Promise((resolve) => setImmediate(resolve))
  t.mock.timers.tick(10_000)
  assert.equal((await pending).status, 502)
  assert.equal(signal.aborted, true)
  assert.equal(fetch.mock.callCount(), 1)
})

test('preflight retains the explicit origin allowlist and unsupported methods list allowed methods', async (t) => {
  configure(t)
  const allowed = await invoke(undefined, { method: 'OPTIONS', origin: 'https://site.example.test' })
  assert.equal(allowed.status, 204)
  assert.equal(allowed.headers['Access-Control-Allow-Origin'], 'https://site.example.test')
  const other = await invoke(undefined, { method: 'OPTIONS', origin: 'https://other.example.test' })
  assert.equal(other.headers['Access-Control-Allow-Origin'], undefined)
  const unsupported = await invoke(undefined, { method: 'GET' })
  assert.equal(unsupported.status, 405)
  assert.equal(unsupported.headers.Allow, 'POST, OPTIONS')
})

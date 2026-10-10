import test from 'node:test'
import assert from 'node:assert/strict'
import { isAbortError, requestJson } from './request.js'

test('forwards fetch options and returns valid JSON', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/example')
    assert.equal(options.method, 'POST')
    assert.equal(options.cache, 'no-store')
    assert.equal(options.body, '{"test":true}')
    assert.ok(options.signal)
    return { ok: true, json: async () => ({ total: 10 }) }
  })
  assert.deepEqual(await requestJson('/api/example', { method: 'POST', cache: 'no-store', body: '{"test":true}' }), { total: 10 })
})

test('preserves server errors and rejects invalid successful bodies', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, json: async () => ({ error: '地点不可用' }) }))
  await assert.rejects(requestJson('/api/example'), /地点不可用/)
  for (const payload of [null, [], 'html']) {
    globalThis.fetch = async () => ({ ok: true, json: async () => payload })
    await assert.rejects(requestJson('/api/example', { errorMessage: '无效回答' }), /无效回答/)
  }
})

test('timeout aborts fetch and settles even if the transport ignores cancellation', async (t) => {
  let transportSignal
  t.mock.method(globalThis, 'fetch', async (_, { signal }) => {
    transportSignal = signal
    return new Promise(() => {})
  })
  await assert.rejects(requestJson('/api/example', { timeoutMs: 5 }), { name: 'TimeoutError' })
  assert.equal(transportSignal.aborted, true)
})

test('timeout also covers a response whose JSON body never finishes', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: () => new Promise(() => {}) }))
  await assert.rejects(requestJson('/api/example', { timeoutMs: 5 }), { name: 'TimeoutError' })
})

test('caller cancellation cancels the transport and rejects with AbortError', async (t) => {
  const controller = new AbortController()
  let transportSignal
  t.mock.method(globalThis, 'fetch', async (_, { signal }) => {
    transportSignal = signal
    return new Promise(() => {})
  })
  const pending = requestJson('/api/example', { signal: controller.signal })
  controller.abort()
  await assert.rejects(pending, isAbortError)
  assert.equal(transportSignal.aborted, true)
})

test('an already-cancelled request never starts fetch', async (t) => {
  const controller = new AbortController()
  controller.abort()
  const fetch = t.mock.method(globalThis, 'fetch')
  await assert.rejects(requestJson('/api/example', { signal: controller.signal }), isAbortError)
  assert.equal(fetch.mock.callCount(), 0)
})

test('removes caller abort listeners after both success and failure', async (t) => {
  const controller = new AbortController()
  const remove = t.mock.method(controller.signal, 'removeEventListener')
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ ok: true }) }))
  await requestJson('/api/example', { signal: controller.signal })
  assert.equal(remove.mock.callCount(), 1)
  globalThis.fetch = async () => { throw new Error('offline') }
  await assert.rejects(requestJson('/api/example', { signal: controller.signal }), /offline/)
  assert.equal(remove.mock.callCount(), 2)
})

test('still times out on older WebViews without AbortController', async (t) => {
  const original = globalThis.AbortController
  globalThis.AbortController = undefined
  t.after(() => { globalThis.AbortController = original })
  t.mock.method(globalThis, 'fetch', async () => new Promise(() => {}))
  await assert.rejects(requestJson('/api/example', { timeoutMs: 5 }), { name: 'TimeoutError' })
})

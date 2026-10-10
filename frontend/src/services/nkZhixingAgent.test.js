import test from 'node:test'
import assert from 'node:assert/strict'
import {
  askNkZhixingAgent,
  consumeNkZhixingHandoff,
  extractNavigationDestination,
  getRoute,
  getWalkingRoute,
  isNavigationRequest,
  NK_ZHIXING_MESSAGE_LIMIT,
  resolveCampusPlace,
  saveNkZhixingHandoff,
} from './nkZhixingAgent.js'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

test('hands a home question to the map exactly once', () => {
  const storage = memoryStorage()
  assert.equal(saveNkZhixingHandoff({ campus: 'jinnan', message: '  去中心图书馆  ' }, storage), true)
  assert.deepEqual(consumeNkZhixingHandoff(storage), { campus: 'jinnan', message: '去中心图书馆' })
  assert.equal(consumeNkZhixingHandoff(storage), null)
})

test('rejects invalid handoffs and limits message length', () => {
  const storage = memoryStorage()
  assert.equal(saveNkZhixingHandoff({ campus: 'unknown', message: 'test' }, storage), false)
  assert.equal(saveNkZhixingHandoff({ campus: 'balitai', message: ' ' }, storage), false)

  const longMessage = '南'.repeat(NK_ZHIXING_MESSAGE_LIMIT + 20)
  assert.equal(saveNkZhixingHandoff({ campus: 'balitai', message: longMessage }, storage), true)
  assert.equal(consumeNkZhixingHandoff(storage).message.length, NK_ZHIXING_MESSAGE_LIMIT)
})

test('extracts a destination for an AMap fallback only from navigation requests', () => {
  assert.equal(isNavigationRequest('从我的位置出发到公教A怎么走？'), true)
  assert.equal(extractNavigationDestination('从我的位置出发到公教A怎么走？'), '公教A')
  assert.equal(extractNavigationDestination('我想去校医院'), '校医院')
  assert.equal(isNavigationRequest('思源堂的历史是什么？'), false)
  assert.equal(extractNavigationDestination('思源堂的历史是什么？'), '')
})

test('storage denial preserves the same-page handoff exactly once', (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { get sessionStorage() { throw new Error('SecurityError') } },
  })
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'window', descriptor)
    else delete globalThis.window
  })
  assert.equal(saveNkZhixingHandoff({ campus: 'balitai', message: '去校医院' }), true)
  assert.deepEqual(consumeNkZhixingHandoff(), { campus: 'balitai', message: '去校医院' })
  assert.equal(consumeNkZhixingHandoff(), null)
})

test('malformed stored handoffs are consumed without crashing', () => {
  const storage = memoryStorage()
  storage.setItem('nk-zhixing-home-handoff', '{bad json')
  assert.equal(consumeNkZhixingHandoff(storage), null)
  assert.equal(storage.getItem('nk-zhixing-home-handoff'), null)
})

test('a failed storage write cannot restore a previous question over the new handoff', (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const storage = memoryStorage()
  saveNkZhixingHandoff({ campus: 'balitai', message: '旧问题' }, storage)
  storage.setItem = () => { throw new Error('QuotaExceededError') }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { sessionStorage: storage } })
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'window', descriptor)
    else delete globalThis.window
  })
  assert.equal(saveNkZhixingHandoff({ campus: 'jinnan', message: '新问题' }), true)
  assert.deepEqual(consumeNkZhixingHandoff(), { campus: 'jinnan', message: '新问题' })
  assert.equal(consumeNkZhixingHandoff(), null)
})

test('agent validates answers and omits unsafe map link schemes', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_, { body }) => {
    assert.deepEqual(JSON.parse(body).context, { campus: 'jinnan', selectedLocation: { id: 'lib', name: '中心图书馆' } })
    return { ok: true, json: async () => ({ answer: '回答', steps: ['路线建议', null, 1], mapUrl: 'javascript:alert(1)' }) }
  })
  const request = { message: '问题', campus: 'jinnan', selectedLocation: { id: 'lib', name: '中心图书馆' } }
  const result = await askNkZhixingAgent(request)
  assert.equal(result.mapUrl, '')
  assert.deepEqual(result.steps, ['路线建议'])
  for (const answer of [null, '', ' ', 123]) {
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ answer }) })
    await assert.rejects(askNkZhixingAgent(request), /有效回答/)
  }
})

test('place lookup rejects empty, malformed, and out-of-range coordinates', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ coordinate: '117.1,39.1' }) }))
  const request = { campus: 'jinnan', name: '中心图书馆' }
  assert.deepEqual(await resolveCampusPlace(request), [39.1, 117.1])
  for (const coordinate of [null, '', ',', '117.1,', '117.1,39.1,0', '181,39', '117,91', 'abc,39']) {
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ coordinate }) })
    await assert.rejects(resolveCampusPlace(request), /坐标格式无效/)
  }
})

test('route lookup rejects unusable polylines and keeps walking compatibility', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_, { body }) => {
    assert.equal(JSON.parse(body).mode, 'walking')
    return { ok: true, json: async () => ({ routePoints: [[39, 117], [39.1, 117.1]], coordinateSystem: 'GCJ-02' }) }
  })
  const request = { origin: '117,39', destination: '117.1,39.1' }
  assert.equal((await getWalkingRoute({ ...request, mode: 'driving' })).routePoints.length, 2)
  for (const routePoints of [null, [], [[39, 117]], [[39, 117], [NaN, 117]]]) {
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ routePoints }) })
    await assert.rejects(getRoute(request), /路线轨迹格式无效/)
  }
})

test('all service requests honor a cancelled caller signal without fetching', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch')
  const controller = new AbortController()
  controller.abort()
  const options = { signal: controller.signal }
  for (const request of [
    askNkZhixingAgent({ message: '问题', campus: 'jinnan' }, options),
    resolveCampusPlace({ campus: 'jinnan', name: '中心图书馆' }, options),
    getRoute({ origin: '117,39', destination: '117.1,39.1' }, options),
  ]) await assert.rejects(request, { name: 'AbortError' })
  assert.equal(fetch.mock.callCount(), 0)
})

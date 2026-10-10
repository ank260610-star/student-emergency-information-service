import assert from 'node:assert/strict'
import test from 'node:test'
import { getRoute, proxyNkZhixingAgent, resolvePlace } from './services.js'
import { parseCoordinate, parsePolyline, requestJson } from './requestUtils.js'

const env = { AMAP_WEB_SERVICE_KEY: 'test-key' }
const request = (body) => new Request('https://example.test/api', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})
const route = (steps, overrides = {}) => ({
  status: '1', route: { paths: [{ steps, distance: '120', cost: { duration: '90' }, ...overrides }] },
})

test('coordinates reject missing components, extra components and out-of-range values', () => {
  for (const value of [null, ',', ' ,39', '117,', '117,39,0', '181,39', '117,-91', 'NaN,39']) {
    assert.equal(parseCoordinate(value), null, String(value))
  }
  assert.deepEqual(parseCoordinate(' 117.1 , 39.2 '), [39.2, 117.1])
  assert.deepEqual(parseCoordinate('0,0'), [0, 0])
  assert.deepEqual(parsePolyline('117,39;118,40'), [[39, 117], [40, 118]])
  assert.deepEqual(parsePolyline('117,39;,;118,40'), [])
})

test('route requests reject invalid coordinates before making an upstream request', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected upstream call') })
  const result = await getRoute(request({ origin: ',39', destination: '117,39' }), env)
  assert.equal(result.status, 400)
  assert.equal(fetch.mock.callCount(), 0)
})

test('unknown and inherited route modes fall back to walking and return valid metrics', async (t) => {
  let upstreamUrl
  t.mock.method(globalThis, 'fetch', async (url) => {
    upstreamUrl = new URL(url)
    return Response.json(route([{ polyline: '117,39;118,40' }], { distance: '-20', cost: { duration: 'Infinity' } }))
  })
  const result = await getRoute(request({ origin: ' 117, 39 ', destination: '118,40', mode: 'toString' }), env)
  assert.equal(result.status, 200)
  assert.equal(upstreamUrl.pathname, '/v5/direction/walking')
  assert.equal(upstreamUrl.searchParams.get('origin'), '117,39')
  assert.deepEqual(await result.json(), {
    routePoints: [[39, 117], [40, 118]], coordinateSystem: 'GCJ-02',
    distanceMeters: 0, durationSeconds: 0, mode: 'walking',
  })
})

test('routes do not silently join across missing or malformed upstream segments', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch')
  for (const steps of [
    [{ polyline: '117,39;118,40' }, { polyline: 'bad' }],
    [{ polyline: '117,39;181,40;118,40' }],
    { polyline: '117,39;118,40' },
  ]) {
    fetch.mock.mockImplementation(async () => Response.json(route(steps)))
    assert.equal((await getRoute(request({ origin: '117,39', destination: '118,40' }), env)).status, 502)
  }
})

test('place lookup distinguishes upstream failures from an empty search result', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ status: '0', pois: [] }))
  assert.equal((await resolvePlace(request({ campus: 'jinnan', name: '图书馆' }), env)).status, 502)
  fetch.mock.mockImplementation(async () => Response.json({ status: '1', pois: [] }))
  assert.equal((await resolvePlace(request({ campus: 'jinnan', name: '图书馆' }), env)).status, 404)
  fetch.mock.mockImplementation(async () => Response.json({ status: '1', pois: [{ location: ',39' }] }))
  assert.equal((await resolvePlace(request({ campus: 'jinnan', name: '图书馆' }), env)).status, 502)
})

test('agent accepts a full-length input with appended context and validates response fields', async (t) => {
  const message = '问'.repeat(500) + '\n【当前校区已确定】津南校区'
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://nk-api.fallaxaura.com/api/nk-zhixing')
    assert.deepEqual(JSON.parse(options.body), { message })
    return Response.json({ answer: '可以。', steps: ['前往', null, 42, ' ', '确认'], warning: false })
  })
  const result = await proxyNkZhixingAgent(request({ message }))
  assert.equal(result.status, 200)
  assert.deepEqual(await result.json(), {
    answer: '可以。', steps: ['前往', '确认'], warning: '', mapUrl: '', locationId: '',
  })
  for (const value of ['', 42, '问'.repeat(8_001)]) {
    assert.equal((await proxyNkZhixingAgent(request({ message: value }))).status, 400)
  }
})

test('agent rejects successful HTTP responses without a usable answer', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch')
  for (const answer of [null, 42, {}, ' ']) {
    fetch.mock.mockImplementation(async () => Response.json({ answer }))
    assert.equal((await proxyNkZhixingAgent(request({ message: '去图书馆' }))).status, 502)
  }
})

test('upstream timeout stays active while reading the response body', async (t) => {
  let signal
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    signal = options.signal
    return {
      ok: true,
      json: () => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true })
      }),
    }
  })
  const result = await requestJson('https://example.test', {}, 5)
  assert.equal(signal.aborted, true)
  assert.equal(result.payload, null)
})

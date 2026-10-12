const assert = require('node:assert/strict')
const test = require('node:test')

const handler = require('../api/[...path].js')

function responseRecorder() {
  return {
    status: null,
    headers: null,
    body: '',
    writeHead(status, headers) {
      this.status = status
      this.headers = headers
    },
    end(body = '') {
      this.body = body
    },
  }
}

test('Vercel compatibility proxy forwards only campus APIs without browser origin headers', async () => {
  const originalFetch = global.fetch
  let forwarded
  global.fetch = async (url, options) => {
    forwarded = { url, options }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  try {
    const response = responseRecorder()
    await handler({
      method: 'POST',
      url: '/api/nk-zhixing/place',
      headers: {
        'content-type': 'application/json',
        origin: 'https://student-emergency-information-servi.vercel.app',
        'sec-fetch-site': 'same-origin',
      },
      body: { campus: 'jinnan', name: '文科食堂' },
    }, response)

    assert.equal(response.status, 200)
    assert.equal(forwarded.url, 'https://student-emergency-information-service.ank260610.workers.dev/api/nk-zhixing/place')
    assert.deepEqual(forwarded.options.headers, { 'Content-Type': 'application/json' })
    assert.equal(forwarded.options.body, JSON.stringify({ campus: 'jinnan', name: '文科食堂' }))
  } finally {
    global.fetch = originalFetch
  }
})

test('Vercel compatibility proxy rejects unrelated paths', async () => {
  const response = responseRecorder()
  await handler({ method: 'GET', url: '/api/private', headers: {} }, response)
  assert.equal(response.status, 404)
  assert.deepEqual(JSON.parse(response.body), { error: 'Not found' })
})

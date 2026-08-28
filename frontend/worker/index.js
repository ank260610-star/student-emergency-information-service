import { DurableObject } from 'cloudflare:workers'

const COUNTER_NAME = 'azk.fallaxaura.dpdns.org'
const VISIT_API_PATH = '/api/visits'
const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  })
}

function isAllowedBrowserWrite(request, url) {
  const origin = request.headers.get('Origin')
  if (origin && origin !== url.origin) return false

  const fetchSite = request.headers.get('Sec-Fetch-Site')
  return !fetchSite || fetchSite === 'same-origin' || fetchSite === 'none'
}

export class VisitCounter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env)
    this.sql = ctx.storage.sql
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS visit_counter (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0)
      );
      INSERT OR IGNORE INTO visit_counter (id, total) VALUES (1, 0);
    `)
  }

  getTotal() {
    return Number(this.sql.exec('SELECT total FROM visit_counter WHERE id = 1').one().total)
  }

  increment() {
    return Number(this.sql.exec(`
      UPDATE visit_counter
      SET total = total + 1
      WHERE id = 1
      RETURNING total
    `).one().total)
  }

  async fetch(request) {
    if (request.method === 'GET') return jsonResponse({ total: this.getTotal() })
    if (request.method === 'POST') return jsonResponse({ total: this.increment() })
    return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST' })
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname !== VISIT_API_PATH) return env.ASSETS.fetch(request)

    if (request.method !== 'GET' && request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST' })
    }

    if (request.method === 'POST' && !isAllowedBrowserWrite(request, url)) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    try {
      const id = env.VISIT_COUNTER.idFromName(COUNTER_NAME)
      const counter = env.VISIT_COUNTER.get(id)
      return await counter.fetch(new Request('https://visit-counter.internal/', {
        method: request.method,
      }))
    } catch (error) {
      console.error('Visit counter request failed.', error)
      return jsonResponse({ error: 'Visit counter unavailable' }, 503)
    }
  },
}

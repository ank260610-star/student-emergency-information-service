import { DurableObject } from 'cloudflare:workers'
import { getRoute, proxyNkZhixingAgent, resolvePlace } from './services.js'
import { jsonResponse } from './requestUtils.js'

const COUNTER_NAME = 'azk.fallaxaura.dpdns.org'
const VISIT_API_PATH = '/api/visits'
const NK_ZHIXING_API_PATH = '/api/nk-zhixing'
const NK_ZHIXING_ROUTE_PATH = '/api/nk-zhixing/route'
const NK_ZHIXING_PLACE_PATH = '/api/nk-zhixing/place'

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

    if (
      url.pathname !== VISIT_API_PATH
      && url.pathname !== NK_ZHIXING_API_PATH
      && url.pathname !== NK_ZHIXING_ROUTE_PATH
      && url.pathname !== NK_ZHIXING_PLACE_PATH
    ) return env.ASSETS.fetch(request)

    if (url.pathname === NK_ZHIXING_ROUTE_PATH) {
      if (!isAllowedBrowserWrite(request, url)) return jsonResponse({ error: 'Forbidden' }, 403)
      return getRoute(request, env)
    }

    if (url.pathname === NK_ZHIXING_PLACE_PATH) {
      if (!isAllowedBrowserWrite(request, url)) return jsonResponse({ error: 'Forbidden' }, 403)
      return resolvePlace(request, env)
    }

    if (url.pathname === NK_ZHIXING_API_PATH) {
      if (!isAllowedBrowserWrite(request, url)) return jsonResponse({ error: 'Forbidden' }, 403)
      return proxyNkZhixingAgent(request)
    }

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

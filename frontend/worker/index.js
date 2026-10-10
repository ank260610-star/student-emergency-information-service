import { DurableObject } from 'cloudflare:workers'

const COUNTER_NAME = 'azk.fallaxaura.dpdns.org'
const VISIT_API_PATH = '/api/visits'
const NK_ZHIXING_API_PATH = '/api/nk-zhixing'
const NK_ZHIXING_ROUTE_PATH = '/api/nk-zhixing/route'
const NK_ZHIXING_PLACE_PATH = '/api/nk-zhixing/place'
// Keep browser requests same-origin. The campus proxy owns the platform key;
// this Worker only forwards the user's navigation text to that proxy.
const NK_ZHIXING_UPSTREAM_URL = 'https://nk-api.fallaxaura.com/api/nk-zhixing'
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

function isCoordinate(value) {
  if (typeof value !== 'string') return false
  const parts = value.split(',')
  if (parts.length !== 2) return false
  const [longitude, latitude] = parts.map((part) => Number(part.trim()))
  return Number.isFinite(longitude)
    && Number.isFinite(latitude)
    && longitude >= -180
    && longitude <= 180
    && latitude >= -90
    && latitude <= 90
}

function parsePolyline(polyline) {
  if (typeof polyline !== 'string') return []
  return polyline.split(';').map((pair) => {
    const [longitude, latitude] = pair.split(',').map(Number)
    return Number.isFinite(latitude) && Number.isFinite(longitude) ? [latitude, longitude] : null
  }).filter(Boolean)
}

function parseAgentPayload(text) {
  try {
    return JSON.parse(text)
  } catch {
    const dataLines = text.split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
    for (const line of dataLines.reverse()) {
      try {
        const payload = JSON.parse(line)
        if (payload?.answer || payload?.data?.answer) return payload
      } catch {
        // Ignore non-JSON stream markers.
      }
    }
    return null
  }
}

const ROUTE_MODES = {
  walking: { endpoint: 'walking', label: '步行' },
  bicycling: { endpoint: 'bicycling', label: '骑行' },
  driving: { endpoint: 'driving', label: '驾车' },
}

async function getRoute(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'POST' })
  }
  if (!env.AMAP_WEB_SERVICE_KEY) {
    return jsonResponse({ error: '路线服务尚未完成配置。' }, 503)
  }

  let payload
  try {
    payload = await request.json()
  } catch {
    return jsonResponse({ error: '请求格式无效。' }, 400)
  }
  if (!isCoordinate(payload?.origin) || !isCoordinate(payload?.destination)) {
    return jsonResponse({ error: '路线坐标格式无效。' }, 400)
  }
  const mode = ROUTE_MODES[payload?.mode] || ROUTE_MODES.walking

  const parameters = new URLSearchParams({
    key: env.AMAP_WEB_SERVICE_KEY,
    origin: payload.origin,
    destination: payload.destination,
    show_fields: 'cost,polyline',
  })
  try {
    const upstream = await fetch(`https://restapi.amap.com/v5/direction/${mode.endpoint}?${parameters}`)
    const routePayload = await upstream.json().catch(() => null)
    const path = routePayload?.route?.paths?.[0]
    if (!upstream.ok || routePayload?.status !== '1' || !path) {
      return jsonResponse({ error: `高德暂未返回可绘制的${mode.label}路线。` }, 502)
    }

    const routePoints = path.steps?.flatMap((step) => parsePolyline(step.polyline)) || []
    if (routePoints.length < 2) {
      return jsonResponse({ error: '高德未返回路线轨迹点。' }, 502)
    }
    return jsonResponse({
      routePoints,
      coordinateSystem: 'GCJ-02',
      distanceMeters: Number(path.distance) || 0,
      durationSeconds: Number(path.cost?.duration || path.duration) || 0,
      mode: Object.hasOwn(ROUTE_MODES, payload?.mode) ? payload.mode : 'walking',
    })
  } catch (error) {
    console.error('AMap route request failed.', error)
    return jsonResponse({ error: '路线服务暂时无法响应，请稍后再试。' }, 502)
  }
}

async function resolvePlace(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'POST' })
  }
  if (!env.AMAP_WEB_SERVICE_KEY) {
    return jsonResponse({ error: '地点服务尚未完成配置。' }, 503)
  }

  let payload
  try {
    payload = await request.json()
  } catch {
    return jsonResponse({ error: '请求格式无效。' }, 400)
  }
  const campus = payload?.campus === 'balitai' ? '八里台校区' : payload?.campus === 'jinnan' ? '津南校区' : ''
  const name = typeof payload?.name === 'string' ? payload.name.trim() : ''
  if (!campus || !name || name.length > 80) {
    return jsonResponse({ error: '地点名称或校区无效。' }, 400)
  }

  const parameters = new URLSearchParams({
      key: env.AMAP_WEB_SERVICE_KEY,
      keywords: `南开大学${campus}${name}`,
      region: '天津市',
      city_limit: 'true',
      page_size: '1',
  })
  try {
    const upstream = await fetch(`https://restapi.amap.com/v5/place/text?${parameters}`)
    const placePayload = await upstream.json().catch(() => null)
    const place = placePayload?.pois?.[0]
    const coordinate = place?.location
    if (!upstream.ok || placePayload?.status !== '1' || !isCoordinate(coordinate)) {
      return jsonResponse({ error: '高德暂未找到该地点的可用坐标。' }, 404)
    }
    return jsonResponse({
      coordinate,
      coordinateSystem: 'GCJ-02',
      name: typeof place?.name === 'string' ? place.name : name,
      source: 'amap-fallback',
    })
  } catch (error) {
    console.error('AMap place request failed.', error)
    return jsonResponse({ error: '地点服务暂时无法响应，请稍后再试。' }, 502)
  }
}

async function proxyNkZhixingAgent(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'POST' })
  }

  let payload
  try {
    payload = await request.json()
  } catch {
    return jsonResponse({ error: '请求格式无效。' }, 400)
  }

  const message = typeof payload?.message === 'string' ? payload.message.trim() : ''
  if (!message || message.length > 500) {
    return jsonResponse({ error: '请输入 1–500 个字的导航需求。' }, 400)
  }

  try {
    const upstream = await fetch(NK_ZHIXING_UPSTREAM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    const upstreamPayload = await upstream.json().catch(() => null)
    if (!upstream.ok || typeof upstreamPayload?.answer !== 'string' || !upstreamPayload.answer.trim()) {
      return jsonResponse({ error: 'NK 智行暂时未返回有效回答，请稍后再试。' }, 502)
    }

    return jsonResponse({
      answer: upstreamPayload.answer,
      steps: Array.isArray(upstreamPayload.steps) ? upstreamPayload.steps.slice(0, 6) : [],
      warning: typeof upstreamPayload.warning === 'string' ? upstreamPayload.warning : '',
      mapUrl: typeof upstreamPayload.mapUrl === 'string' ? upstreamPayload.mapUrl : '',
      locationId: typeof upstreamPayload.locationId === 'string' ? upstreamPayload.locationId : '',
    })
  } catch (error) {
    console.error('NK Zhixing agent request failed.', error)
    return jsonResponse({ error: 'NK 智行暂时无法响应，请稍后再试。' }, 502)
  }
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
      return proxyNkZhixingAgent(request, env)
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

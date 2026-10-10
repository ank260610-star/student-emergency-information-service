import { jsonResponse, nonNegativeNumber, parseCoordinate, parsePolyline, requestJson } from './requestUtils.js'

// Browser input is limited to 500 characters; this includes appended campus,
// location and history context. Keep the adapter's limit in api/nk-zhixing.js aligned.
const MAX_AGENT_MESSAGE_LENGTH = 8_000
const AGENT_TIMEOUT_MS = 60_000
// The campus proxy owns the platform key. Keep browser requests same-origin.
const NK_ZHIXING_UPSTREAM_URL = 'https://nk-api.fallaxaura.com/api/nk-zhixing'
const ROUTE_MODES = {
  walking: { endpoint: 'walking', label: '步行' },
  bicycling: { endpoint: 'bicycling', label: '骑行' },
  driving: { endpoint: 'driving', label: '驾车' },
}

export async function getRoute(request, env) {
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
  const origin = parseCoordinate(payload?.origin)
  const destination = parseCoordinate(payload?.destination)
  if (!origin || !destination) {
    return jsonResponse({ error: '路线坐标格式无效。' }, 400)
  }
  const modeName = typeof payload?.mode === 'string' && Object.hasOwn(ROUTE_MODES, payload.mode)
    ? payload.mode : 'walking'
  const mode = ROUTE_MODES[modeName]
  const parameters = new URLSearchParams({
    key: env.AMAP_WEB_SERVICE_KEY,
    origin: `${origin[1]},${origin[0]}`,
    destination: `${destination[1]},${destination[0]}`,
    show_fields: 'cost,polyline',
  })

  try {
    const { response, payload: routePayload } = await requestJson(`https://restapi.amap.com/v5/direction/${mode.endpoint}?${parameters}`)
    const path = Array.isArray(routePayload?.route?.paths) ? routePayload.route.paths[0] : null
    if (!response.ok || routePayload?.status !== '1' || !path) {
      return jsonResponse({ error: `高德暂未返回可绘制的${mode.label}路线。` }, 502)
    }
    const segments = Array.isArray(path.steps) ? path.steps.map((step) => parsePolyline(step?.polyline)) : []
    const routePoints = segments.flat()
    if (routePoints.length < 2 || segments.some((segment) => !segment.length)) {
      return jsonResponse({ error: '高德未返回完整、有效的路线轨迹点。' }, 502)
    }
    return jsonResponse({
      routePoints,
      coordinateSystem: 'GCJ-02',
      distanceMeters: nonNegativeNumber(path.distance),
      durationSeconds: nonNegativeNumber(path.cost?.duration ?? path.duration),
      mode: modeName,
    })
  } catch {
    // Fetch errors can contain the upstream URL and its service key.
    console.error('AMap route request failed.')
    return jsonResponse({ error: '路线服务暂时无法响应，请稍后再试。' }, 502)
  }
}

export async function resolvePlace(request, env) {
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
    const { response, payload: placePayload } = await requestJson(`https://restapi.amap.com/v5/place/text?${parameters}`)
    if (!response.ok || placePayload?.status !== '1' || !Array.isArray(placePayload.pois)) {
      return jsonResponse({ error: '高德地点服务暂时无法响应，请稍后再试。' }, 502)
    }
    const place = placePayload.pois[0]
    if (!place) {
      return jsonResponse({ error: '高德暂未找到该地点的可用坐标。' }, 404)
    }
    const coordinate = parseCoordinate(place.location)
    if (!coordinate) {
      return jsonResponse({ error: '高德暂未返回有效的地点坐标。' }, 502)
    }
    return jsonResponse({
      coordinate: `${coordinate[1]},${coordinate[0]}`,
      coordinateSystem: 'GCJ-02',
      name: typeof place.name === 'string' ? place.name : name,
      source: 'amap-fallback',
    })
  } catch {
    console.error('AMap place request failed.')
    return jsonResponse({ error: '地点服务暂时无法响应，请稍后再试。' }, 502)
  }
}

export async function proxyNkZhixingAgent(request) {
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
  if (!message || message.length > MAX_AGENT_MESSAGE_LENGTH) {
    return jsonResponse({ error: '导航请求为空或附带上下文过长，请缩短后重试。' }, 400)
  }

  try {
    const { response, payload: upstreamPayload } = await requestJson(NK_ZHIXING_UPSTREAM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    }, AGENT_TIMEOUT_MS)
    if (!response.ok || typeof upstreamPayload?.answer !== 'string' || !upstreamPayload.answer.trim()) {
      return jsonResponse({ error: 'NK 智行暂时未返回有效回答，请稍后再试。' }, 502)
    }
    return jsonResponse({
      answer: upstreamPayload.answer,
      steps: Array.isArray(upstreamPayload.steps)
        ? upstreamPayload.steps.filter((step) => typeof step === 'string' && step.trim()).slice(0, 6) : [],
      warning: typeof upstreamPayload.warning === 'string' ? upstreamPayload.warning : '',
      mapUrl: typeof upstreamPayload.mapUrl === 'string' ? upstreamPayload.mapUrl : '',
      locationId: typeof upstreamPayload.locationId === 'string' ? upstreamPayload.locationId : '',
    })
  } catch {
    console.error('NK Zhixing agent request failed.')
    return jsonResponse({ error: 'NK 智行暂时无法响应，请稍后再试。' }, 502)
  }
}

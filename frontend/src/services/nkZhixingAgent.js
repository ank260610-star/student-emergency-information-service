import { requestJson } from '../utils/request.js'
import { isNavigationPoint } from './nkZhixingNavigation.js'

export { extractNavigationDestination, isNavigationRequest } from './nkZhixingNavigation.js'

const AGENT_API_URL = '/api/nk-zhixing'
const ROUTE_API_PATH = '/api/nk-zhixing/route'
const PLACE_API_PATH = '/api/nk-zhixing/place'
export const NK_ZHIXING_MESSAGE_LIMIT = 500
const HANDOFF_KEY = 'nk-zhixing-home-handoff'
let pendingHandoff = null

export function saveNkZhixingHandoff({ campus, message }, storage) {
  const normalizedMessage = String(message || '').trim().slice(0, NK_ZHIXING_MESSAGE_LIMIT)
  if (!['balitai', 'jinnan'].includes(campus) || !normalizedMessage) return false
  const handoff = { campus, message: normalizedMessage }
  if (!storage) pendingHandoff = handoff

  try {
    // Access sessionStorage inside the guard: private WebViews can throw on access.
    const session = storage || window.sessionStorage
    session.setItem(HANDOFF_KEY, JSON.stringify(handoff))
    return true
  } catch {
    // Vue Router stays in the same document, so the handoff still works when
    // embedded browsers disable sessionStorage. Reload persistence is unavailable.
    return !storage
  }
}

export function consumeNkZhixingHandoff(storage) {
  const fallback = !storage ? pendingHandoff : null
  if (!storage) pendingHandoff = null
  try {
    const session = storage || window.sessionStorage
    const rawValue = session.getItem(HANDOFF_KEY)
    session.removeItem(HANDOFF_KEY)
    if (!rawValue) return fallback

    const value = JSON.parse(rawValue)
    const message = String(value?.message || '').trim().slice(0, NK_ZHIXING_MESSAGE_LIMIT)
    if (!['balitai', 'jinnan'].includes(value?.campus) || !message) return fallback
    return fallback || { campus: value.campus, message }
  } catch {
    return fallback
  }
}

function postJson(url, body, { signal, timeoutMs, errorMessage }) {
  return requestJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
    timeoutMs,
    errorMessage,
  })
}

function safeMapUrl(value) {
  if (typeof value !== 'string') return ''
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

export async function askNkZhixingAgent({ message, campus, selectedLocation }, { signal } = {}) {
  const errorMessage = 'NK 智行暂时未返回有效回答，请稍后再试。'
  const payload = await postJson(AGENT_API_URL, {
    message,
    context: {
      campus,
      selectedLocation: selectedLocation ? { id: selectedLocation.id, name: selectedLocation.name } : null,
    },
  }, { signal, timeoutMs: 65000, errorMessage })
  if (typeof payload.answer !== 'string' || !payload.answer.trim()) throw new Error(errorMessage)
  return {
    ...payload,
    steps: Array.isArray(payload.steps) ? payload.steps.filter((step) => typeof step === 'string') : [],
    mapUrl: safeMapUrl(payload.mapUrl),
    locationId: typeof payload.locationId === 'string' ? payload.locationId : '',
    warning: typeof payload.warning === 'string' ? payload.warning : '',
  }
}

export async function getRoute({ origin, destination, mode = 'walking' }, { signal } = {}) {
  const payload = await postJson(ROUTE_API_PATH, { origin, destination, mode }, {
    signal, timeoutMs: 20000, errorMessage: '路线轨迹暂时无法加载。',
  })
  if (!Array.isArray(payload.routePoints) || payload.routePoints.length < 2 || !payload.routePoints.every(isNavigationPoint)) {
    throw new Error('路线轨迹格式无效，请稍后重试。')
  }
  return payload
}

export async function resolveCampusPlace({ campus, name, locationId = '' }, { signal } = {}) {
  const payload = await postJson(PLACE_API_PATH, { campus, name, locationId }, {
    signal, timeoutMs: 15000, errorMessage: '地点坐标暂时无法加载。',
  })
  const parts = typeof payload.coordinate === 'string' ? payload.coordinate.split(',') : []
  if (parts.length !== 2 || parts.some((part) => !part.trim())) throw new Error('地点坐标格式无效。')
  const [longitude, latitude] = parts.map(Number)
  if (!isNavigationPoint([latitude, longitude])) throw new Error('地点坐标格式无效。')
  return [latitude, longitude]
}

// Retained for existing callers while routes migrate to selectable mobility modes.
export function getWalkingRoute(route, options) {
  return getRoute({ ...route, mode: 'walking' }, options)
}

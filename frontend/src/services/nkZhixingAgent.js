const AGENT_API_URL = '/api/nk-zhixing'
const ROUTE_API_PATH = '/api/nk-zhixing/route'
const PLACE_API_PATH = '/api/nk-zhixing/place'
export const NK_ZHIXING_MESSAGE_LIMIT = 500
const HANDOFF_KEY = 'nk-zhixing-home-handoff'
const NAVIGATION_REQUEST_PATTERN = /(?:前往|抵达|到|去|怎么走|怎么去|如何去|导航|路线)/

export function isNavigationRequest(value) {
  return NAVIGATION_REQUEST_PATTERN.test(String(value || ''))
}

export function extractNavigationDestination(value) {
  const text = String(value || '').replaceAll(/\s/g, '').trim()
  if (!text || !isNavigationRequest(text)) return ''

  const destination = text
    .split(/(?:前往|抵达|到|去)/)
    .at(-1)
    ?.replace(/^(?:一下|往|校园内|校内)/, '')
    .replace(/(?:怎么走|怎么去|如何去|导航|路线|在哪里|在哪儿|在哪|？|。|！|，|,).*/, '')
    .trim()
    .slice(0, 80)

  return destination || ''
}

export function saveNkZhixingHandoff({ campus, message }, storage = window.sessionStorage) {
  const normalizedMessage = String(message || '').trim().slice(0, NK_ZHIXING_MESSAGE_LIMIT)
  if (!['balitai', 'jinnan'].includes(campus) || !normalizedMessage) return false

  try {
    storage.setItem(HANDOFF_KEY, JSON.stringify({ campus, message: normalizedMessage }))
    return true
  } catch {
    return false
  }
}

export function consumeNkZhixingHandoff(storage = window.sessionStorage) {
  try {
    const rawValue = storage.getItem(HANDOFF_KEY)
    storage.removeItem(HANDOFF_KEY)
    if (!rawValue) return null

    const value = JSON.parse(rawValue)
    const message = String(value?.message || '').trim().slice(0, NK_ZHIXING_MESSAGE_LIMIT)
    if (!['balitai', 'jinnan'].includes(value?.campus) || !message) return null
    return { campus: value.campus, message }
  } catch {
    return null
  }
}

export async function askNkZhixingAgent({ message, campus, selectedLocation }) {
  const response = await fetch(AGENT_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      context: {
        campus,
        selectedLocation: selectedLocation
          ? { id: selectedLocation.id, name: selectedLocation.name }
          : null,
      },
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error || 'NK 智行暂时无法响应，请稍后再试。')
  return payload
}

export async function getRoute({ origin, destination, mode = 'walking' }) {
  const response = await fetch(ROUTE_API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination, mode }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error || '路线轨迹暂时无法加载。')
  return payload
}

export async function resolveCampusPlace({ campus, name, locationId = '' }) {
  const response = await fetch(PLACE_API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campus, name, locationId }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error || '地点坐标暂时无法加载。')

  const [longitude, latitude] = String(payload.coordinate || '').split(',').map(Number)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('地点坐标格式无效。')
  return [latitude, longitude]
}

// Retained for existing callers while routes migrate to selectable mobility modes.
export function getWalkingRoute(route) {
  return getRoute({ ...route, mode: 'walking' })
}

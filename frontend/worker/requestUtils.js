const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
}

export function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  })
}

// The deadline includes reading the body, not just receiving response headers.
export async function requestJson(url, options = {}, timeoutMs = 12_000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    const payload = await response.json().catch(() => null)
    return { response, payload }
  } finally {
    clearTimeout(timer)
  }
}

export function parseCoordinate(value) {
  if (typeof value !== 'string') return null
  const parts = value.split(',').map((part) => part.trim())
  if (parts.length !== 2 || parts.some((part) => !part)) return null
  const [longitude, latitude] = parts.map(Number)
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)
    || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) return null
  return [latitude, longitude]
}

export function parsePolyline(polyline) {
  if (typeof polyline !== 'string' || !polyline.trim()) return []
  const points = polyline.split(';').map(parseCoordinate)
  // Do not silently bridge a corrupt part of the route with a straight line.
  return points.every(Boolean) ? points : []
}

export function nonNegativeNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : 0
}

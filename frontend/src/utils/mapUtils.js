export function imagePointToSimpleLatLng(imagePoint, imageSize) {
  if (!imagePoint || !imageSize?.width || !imageSize?.height) return null

  const x = imageSize.width * (imagePoint.x / 100)
  const yFromTop = imageSize.height * (imagePoint.y / 100)
  return [imageSize.height - yFromTop, x]
}

export function geoPointToImageLatLng(geoPoint, geoBounds, imageSize) {
  if (!Array.isArray(geoPoint) || !Array.isArray(geoBounds) || geoBounds.length !== 2) return null
  if (!imageSize?.width || !imageSize?.height) return null

  const [latitude, longitude] = geoPoint
  const [[south, west], [north, east]] = geoBounds
  if (![latitude, longitude, south, west, north, east].every(Number.isFinite)) return null
  if (latitude < south || latitude > north || longitude < west || longitude > east) return null

  const longitudeSpan = east - west
  const latitudeSpan = north - south
  if (longitudeSpan <= 0 || latitudeSpan <= 0) return null

  const x = ((longitude - west) / longitudeSpan) * imageSize.width
  const y = ((latitude - south) / latitudeSpan) * imageSize.height
  return [y, x]
}

const EARTH_RADIUS = 6378245.0
const ECCENTRICITY_SQUARED = 0.00669342162296594323

function isInChina(latitude, longitude) {
  return longitude >= 72.004 && longitude <= 137.8347
    && latitude >= 0.8293 && latitude <= 55.8271
}

function transformLatitude(longitude, latitude) {
  let value = -100 + 2 * longitude + 3 * latitude + 0.2 * latitude * latitude
    + 0.1 * longitude * latitude + 0.2 * Math.sqrt(Math.abs(longitude))
  value += (20 * Math.sin(6 * longitude * Math.PI) + 20 * Math.sin(2 * longitude * Math.PI)) * 2 / 3
  value += (20 * Math.sin(latitude * Math.PI) + 40 * Math.sin(latitude / 3 * Math.PI)) * 2 / 3
  return value + (160 * Math.sin(latitude / 12 * Math.PI) + 320 * Math.sin(latitude * Math.PI / 30)) * 2 / 3
}

function transformLongitude(longitude, latitude) {
  let value = 300 + longitude + 2 * latitude + 0.1 * longitude * longitude
    + 0.1 * longitude * latitude + 0.1 * Math.sqrt(Math.abs(longitude))
  value += (20 * Math.sin(6 * longitude * Math.PI) + 20 * Math.sin(2 * longitude * Math.PI)) * 2 / 3
  value += (20 * Math.sin(longitude * Math.PI) + 40 * Math.sin(longitude / 3 * Math.PI)) * 2 / 3
  return value + (150 * Math.sin(longitude / 12 * Math.PI) + 300 * Math.sin(longitude / 30 * Math.PI)) * 2 / 3
}

// AMap route geometry is GCJ-02. Leaflet's OSM tiles use WGS-84, so route
// points must be converted before they are rendered on the online base map.
export function gcj02ToWgs84(point) {
  if (!Array.isArray(point) || point.length !== 2) return null
  const [latitude, longitude] = point
  if (![latitude, longitude].every(Number.isFinite) || !isInChina(latitude, longitude)) return point

  const adjustedLongitude = longitude - 105
  const adjustedLatitude = latitude - 35
  let latitudeOffset = transformLatitude(adjustedLongitude, adjustedLatitude)
  let longitudeOffset = transformLongitude(adjustedLongitude, adjustedLatitude)
  const radians = latitude / 180 * Math.PI
  const magic = 1 - ECCENTRICITY_SQUARED * Math.sin(radians) ** 2
  const sqrtMagic = Math.sqrt(magic)
  latitudeOffset = (latitudeOffset * 180) / ((EARTH_RADIUS * (1 - ECCENTRICITY_SQUARED)) / (magic * sqrtMagic) * Math.PI)
  longitudeOffset = (longitudeOffset * 180) / (EARTH_RADIUS / sqrtMagic * Math.cos(radians) * Math.PI)
  return [latitude * 2 - (latitude + latitudeOffset), longitude * 2 - (longitude + longitudeOffset)]
}

// Browser geolocation is WGS-84 while AMap's route API expects GCJ-02 inside
// mainland China. Keep this conversion at the client boundary so raw browser
// positions are never sent to the route service in the wrong coordinate system.
export function wgs84ToGcj02(point) {
  if (!Array.isArray(point) || point.length !== 2) return null
  const [latitude, longitude] = point
  if (![latitude, longitude].every(Number.isFinite) || !isInChina(latitude, longitude)) return point

  const adjustedLongitude = longitude - 105
  const adjustedLatitude = latitude - 35
  let latitudeOffset = transformLatitude(adjustedLongitude, adjustedLatitude)
  let longitudeOffset = transformLongitude(adjustedLongitude, adjustedLatitude)
  const radians = latitude / 180 * Math.PI
  const magic = 1 - ECCENTRICITY_SQUARED * Math.sin(radians) ** 2
  const sqrtMagic = Math.sqrt(magic)
  latitudeOffset = (latitudeOffset * 180) / ((EARTH_RADIUS * (1 - ECCENTRICITY_SQUARED)) / (magic * sqrtMagic) * Math.PI)
  longitudeOffset = (longitudeOffset * 180) / (EARTH_RADIUS / sqrtMagic * Math.cos(radians) * Math.PI)
  return [latitude + latitudeOffset, longitude + longitudeOffset]
}

function projectedMeters([latitude, longitude], referenceLatitude) {
  const latitudeRadians = latitude * Math.PI / 180
  const referenceRadians = referenceLatitude * Math.PI / 180
  return [
    longitude * Math.PI / 180 * EARTH_RADIUS * Math.cos(referenceRadians),
    latitudeRadians * EARTH_RADIUS,
  ]
}

// A short-route approximation suitable for campus-scale deviation detection.
// It deliberately returns Infinity for malformed route data so callers can
// safely avoid announcing a false deviation.
export function distanceToPolylineMeters(point, polyline) {
  if (!Array.isArray(point) || point.length !== 2 || !Array.isArray(polyline) || polyline.length < 2) {
    return Number.POSITIVE_INFINITY
  }
  const [latitude, longitude] = point
  if (![latitude, longitude].every(Number.isFinite)) return Number.POSITIVE_INFINITY

  const [px, py] = projectedMeters(point, latitude)
  let nearest = Number.POSITIVE_INFINITY
  for (let index = 1; index < polyline.length; index += 1) {
    const start = polyline[index - 1]
    const end = polyline[index]
    if (!Array.isArray(start) || !Array.isArray(end) || start.length !== 2 || end.length !== 2) continue
    if (![...start, ...end].every(Number.isFinite)) continue
    const [ax, ay] = projectedMeters(start, latitude)
    const [bx, by] = projectedMeters(end, latitude)
    const dx = bx - ax
    const dy = by - ay
    const segmentLengthSquared = dx * dx + dy * dy
    const ratio = segmentLengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / segmentLengthSquared))
    nearest = Math.min(nearest, Math.hypot(px - (ax + ratio * dx), py - (ay + ratio * dy)))
  }
  return nearest
}

export function semanticZoomLevel(zoom, baselineZoom) {
  const delta = zoom - baselineZoom
  if (delta < 0.5) return 0
  if (delta < 1.5) return 1
  if (delta < 2.5) return 2
  return 3
}

export function markerPresentationForLocation(location, zoom, baselineZoom, state = {}) {
  if (location.emergency) return 'hospital'
  if (state.selected || state.forced) return 'number'

  const level = semanticZoomLevel(zoom, baselineZoom)
  if (level === 0) return 'dot'
  if (level === 1) return location.priority <= 1 ? 'number' : 'dot'
  if (level === 2) return location.priority <= 2 ? 'number' : 'dot'
  return 'number'
}

export function shouldShowPriority(priority, zoom, baselineZoom) {
  return markerPresentationForLocation({ priority }, zoom, baselineZoom) === 'number'
}

export function clampPointToViewportEdge(point, width, height, margin = 36) {
  if (!point || !width || !height) return null
  const isInside = point.x >= margin && point.x <= width - margin
    && point.y >= margin && point.y <= height - margin
  if (isInside) return null

  const center = { x: width / 2, y: height / 2 }
  const dx = point.x - center.x
  const dy = point.y - center.y
  if (dx === 0 && dy === 0) return null

  const scaleX = dx === 0 ? Number.POSITIVE_INFINITY : (width / 2 - margin) / Math.abs(dx)
  const scaleY = dy === 0 ? Number.POSITIVE_INFINITY : (height / 2 - margin) / Math.abs(dy)
  const scale = Math.min(scaleX, scaleY)

  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
    angle: Math.atan2(dy, dx) * (180 / Math.PI),
  }
}

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

// Retain this conversion for any WGS-84 base layer. The current online map
// uses AMap tiles and therefore renders GCJ-02 route geometry directly.
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

function routePointDistance(start, end) {
  if (!Array.isArray(start) || !Array.isArray(end)) return 0
  const referenceLatitude = (start[0] + end[0]) / 2
  const [startX, startY] = projectedMeters(start, referenceLatitude)
  const [endX, endY] = projectedMeters(end, referenceLatitude)
  return Math.hypot(endX - startX, endY - startY)
}

function roundedInstructionDistance(distanceMeters) {
  if (distanceMeters < 100) return Math.max(10, Math.round(distanceMeters / 10) * 10)
  return Math.max(100, Math.round(distanceMeters / 50) * 50)
}

function routeDirectionLabel(start, end) {
  const referenceLatitude = (start[0] + end[0]) / 2
  const [startX, startY] = projectedMeters(start, referenceLatitude)
  const [endX, endY] = projectedMeters(end, referenceLatitude)
  const degrees = (Math.atan2(endX - startX, endY - startY) * 180 / Math.PI + 360) % 360
  return ['北', '东北', '东', '东南', '南', '西南', '西', '西北'][Math.round(degrees / 45) % 8]
}

// Keeps navigation usable while an older route proxy returns geometry without
// AMap's road-name instructions. These cues are deliberately limited to broad
// direction and clear turns; they never invent road or building names.
export function routeInstructionsFromGeometry(polyline) {
  if (!Array.isArray(polyline) || polyline.length < 2) return []
  if (!polyline.every((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite))) return []

  const points = polyline.filter((point, index) => index === 0 || routePointDistance(polyline[index - 1], point) >= 1)
  if (points.length < 2) return []
  const cumulativeDistances = [0]
  for (let index = 1; index < points.length; index += 1) {
    cumulativeDistances.push(cumulativeDistances[index - 1] + routePointDistance(points[index - 1], points[index]))
  }
  const totalDistance = cumulativeDistances.at(-1)
  if (!Number.isFinite(totalDistance) || totalDistance < 1) return []

  let headingIndex = 1
  while (headingIndex < points.length - 1 && cumulativeDistances[headingIndex] < 12) headingIndex += 1
  const instructions = [`沿地图路线向${routeDirectionLabel(points[0], points[headingIndex])}方向出发`]
  let lastInstructionDistance = 0
  const samplingMeters = 12

  for (let index = 1; index < points.length - 1 && instructions.length < 6; index += 1) {
    let beforeIndex = index - 1
    while (beforeIndex > 0 && cumulativeDistances[index] - cumulativeDistances[beforeIndex] < samplingMeters) beforeIndex -= 1
    let afterIndex = index + 1
    while (afterIndex < points.length - 1 && cumulativeDistances[afterIndex] - cumulativeDistances[index] < samplingMeters) afterIndex += 1

    const referenceLatitude = points[index][0]
    const [beforeX, beforeY] = projectedMeters(points[beforeIndex], referenceLatitude)
    const [turnX, turnY] = projectedMeters(points[index], referenceLatitude)
    const [afterX, afterY] = projectedMeters(points[afterIndex], referenceLatitude)
    const incoming = [turnX - beforeX, turnY - beforeY]
    const outgoing = [afterX - turnX, afterY - turnY]
    const incomingLength = Math.hypot(...incoming)
    const outgoingLength = Math.hypot(...outgoing)
    if (incomingLength < 4 || outgoingLength < 4) continue

    const cross = incoming[0] * outgoing[1] - incoming[1] * outgoing[0]
    const dot = incoming[0] * outgoing[0] + incoming[1] * outgoing[1]
    const angle = Math.atan2(cross, dot) * 180 / Math.PI
    const distanceSinceLastInstruction = cumulativeDistances[index] - lastInstructionDistance
    if (Math.abs(angle) < 40 || distanceSinceLastInstruction < 20) continue
    instructions.push(`前行约 ${roundedInstructionDistance(distanceSinceLastInstruction)} 米后${angle > 0 ? '左转' : '右转'}`)
    lastInstructionDistance = cumulativeDistances[index]
  }

  const remainingDistance = totalDistance - lastInstructionDistance
  instructions.push(`继续沿地图路线前行约 ${roundedInstructionDistance(remainingDistance)} 米，到达目的地`)
  return instructions
}

function nearestRouteProgress(point, polyline, cumulativeDistances) {
  const referenceLatitude = point[0]
  const [px, py] = projectedMeters(point, referenceLatitude)
  let nearest = null
  for (let index = 1; index < polyline.length; index += 1) {
    const [ax, ay] = projectedMeters(polyline[index - 1], referenceLatitude)
    const [bx, by] = projectedMeters(polyline[index], referenceLatitude)
    const dx = bx - ax
    const dy = by - ay
    const segmentLengthSquared = dx * dx + dy * dy
    const ratio = segmentLengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / segmentLengthSquared))
    const distance = Math.hypot(px - (ax + ratio * dx), py - (ay + ratio * dy))
    if (!nearest || distance < nearest.distance) {
      const segmentLength = cumulativeDistances[index] - cumulativeDistances[index - 1]
      nearest = {
        distance,
        segmentIndex: index - 1,
        progressMeters: cumulativeDistances[index - 1] + segmentLength * ratio,
      }
    }
  }
  return nearest
}

// Derives a concise live-navigation cue from route geometry. A wider sampling
// window suppresses tiny bends in AMap polylines so they are not announced as turns.
export function nextRouteManeuver(point, polyline) {
  if (!Array.isArray(point) || point.length !== 2 || ![...point].every(Number.isFinite)) return null
  if (!Array.isArray(polyline) || polyline.length < 2) return null
  if (!polyline.every((routePoint) => (
    Array.isArray(routePoint) && routePoint.length === 2 && routePoint.every(Number.isFinite)
  ))) return null

  const cumulativeDistances = [0]
  for (let index = 1; index < polyline.length; index += 1) {
    cumulativeDistances.push(cumulativeDistances[index - 1] + routePointDistance(polyline[index - 1], polyline[index]))
  }
  const progress = nearestRouteProgress(point, polyline, cumulativeDistances)
  if (!progress) return null

  const samplingMeters = 12
  for (let index = progress.segmentIndex + 1; index < polyline.length - 1; index += 1) {
    const distanceToTurn = cumulativeDistances[index] - progress.progressMeters
    if (distanceToTurn < -3) continue

    let beforeIndex = index - 1
    while (beforeIndex > 0 && cumulativeDistances[index] - cumulativeDistances[beforeIndex] < samplingMeters) beforeIndex -= 1
    let afterIndex = index + 1
    while (afterIndex < polyline.length - 1 && cumulativeDistances[afterIndex] - cumulativeDistances[index] < samplingMeters) afterIndex += 1

    const referenceLatitude = polyline[index][0]
    const [beforeX, beforeY] = projectedMeters(polyline[beforeIndex], referenceLatitude)
    const [turnX, turnY] = projectedMeters(polyline[index], referenceLatitude)
    const [afterX, afterY] = projectedMeters(polyline[afterIndex], referenceLatitude)
    const incoming = [turnX - beforeX, turnY - beforeY]
    const outgoing = [afterX - turnX, afterY - turnY]
    const incomingLength = Math.hypot(...incoming)
    const outgoingLength = Math.hypot(...outgoing)
    if (incomingLength < 4 || outgoingLength < 4) continue

    const cross = incoming[0] * outgoing[1] - incoming[1] * outgoing[0]
    const dot = incoming[0] * outgoing[0] + incoming[1] * outgoing[1]
    const angle = Math.atan2(cross, dot) * 180 / Math.PI
    if (Math.abs(angle) < 35) continue
    return {
      type: angle > 0 ? 'left' : 'right',
      label: angle > 0 ? '左转' : '右转',
      symbol: angle > 0 ? '↰' : '↱',
      distanceMeters: Math.max(0, Math.round(distanceToTurn)),
      maneuverId: `turn-${index}`,
    }
  }

  const remainingMeters = Math.max(0, cumulativeDistances.at(-1) - progress.progressMeters)
  if (remainingMeters <= 15) {
    return { type: 'arrive', label: '到达目的地', symbol: '●', distanceMeters: Math.round(remainingMeters), maneuverId: 'finish' }
  }
  return { type: 'straight', label: '继续直行', symbol: '↑', distanceMeters: Math.round(remainingMeters), maneuverId: 'finish' }
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

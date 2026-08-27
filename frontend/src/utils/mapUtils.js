export function imagePointToSimpleLatLng(imagePoint, imageSize) {
  if (!imagePoint || !imageSize?.width || !imageSize?.height) return null

  const x = imageSize.width * (imagePoint.x / 100)
  const yFromTop = imageSize.height * (imagePoint.y / 100)
  return [imageSize.height - yFromTop, x]
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

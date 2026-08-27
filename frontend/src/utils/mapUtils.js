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

export function limitCalloutItems(items, maxPerSide, requiredIds = []) {
  const required = new Set(requiredIds)
  const requiredRank = new Map()
  for (const id of requiredIds) {
    if (id && !requiredRank.has(id)) requiredRank.set(id, requiredRank.size)
  }
  return ['top', 'bottom'].flatMap((side) => {
    const sideItems = items.filter((item) => (item.side || 'bottom') === side)
    if (sideItems.length <= maxPerSide) return sideItems

    const protectedItems = sideItems
      .filter((item) => item.location?.emergency || required.has(item.id))
      .sort((a, b) => Number(Boolean(b.location?.emergency)) - Number(Boolean(a.location?.emergency))
        || (requiredRank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (requiredRank.get(b.id) ?? Number.MAX_SAFE_INTEGER)
        || (a.order ?? 0) - (b.order ?? 0))
      .slice(0, maxPerSide)
    const protectedIds = new Set(protectedItems.map((item) => item.id))
    const remainder = sideItems
      .filter((item) => !protectedIds.has(item.id))
      .sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3) || (a.order ?? 0) - (b.order ?? 0))

    return [...protectedItems, ...remainder.slice(0, Math.max(0, maxPerSide - protectedItems.length))]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  })
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

export function buildCalloutLayout(items, width, height, options = {}) {
  if (!width || !height) return []

  const margin = Math.min(options.margin ?? 76, width * 0.18)
  const topY = options.topY ?? 30
  const bottomY = options.bottomY ?? height - 30
  const topElbowY = options.topElbowY ?? 76
  const bottomElbowY = options.bottomElbowY ?? height - 76

  return ['top', 'bottom'].flatMap((side) => {
    const group = items
      .filter((item) => (item.side || 'bottom') === side)
      .sort((a, b) => a.point.x - b.point.x || (a.order ?? 0) - (b.order ?? 0))

    return group.map((item, index) => {
      const usableWidth = Math.max(0, width - margin * 2)
      const labelX = group.length === 1
        ? width / 2
        : margin + (usableWidth * index) / (group.length - 1)
      const labelY = side === 'top' ? topY : bottomY
      const elbowY = side === 'top' ? topElbowY : bottomElbowY
      const nearLabelY = side === 'top' ? labelY + 18 : labelY - 18

      return {
        ...item,
        side,
        labelX,
        labelY,
        points: [
          [item.point.x, item.point.y],
          [item.point.x, elbowY],
          [labelX, elbowY],
          [labelX, nearLabelY],
        ],
      }
    })
  })
}

export function pointListToSvg(points) {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
}

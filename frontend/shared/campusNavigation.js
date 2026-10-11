export const campusNavigationAreas = {
  balitai: {
    name: '八里台校区',
    // GCJ-02 navigation fence. It includes the verified east/west gates and
    // campus-side perimeter roads, but excludes routes that detour away from campus.
    bounds: [[39.09945, 117.1549], [39.1072, 117.18]],
  },
  jinnan: {
    name: '津南校区',
    // GCJ-02 conversion of the guide-map extent with a small gate tolerance.
    bounds: [[38.9821, 117.3322], [38.9968, 117.3585]],
  },
}

export function parseLongitudeLatitude(value) {
  if (typeof value !== 'string') return null
  const parts = value.split(',')
  if (parts.length !== 2) return null
  const [longitude, latitude] = parts.map((part) => Number(part.trim()))
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) return null
  return [latitude, longitude]
}

export function isPointInsideCampus(campusId, point) {
  const area = campusNavigationAreas[campusId]
  if (!area || !Array.isArray(point) || point.length !== 2) return false
  const [latitude, longitude] = point.map(Number)
  const [[south, west], [north, east]] = area.bounds
  if (![latitude, longitude].every(Number.isFinite)) return false
  return latitude >= south && latitude <= north && longitude >= west && longitude <= east
}

export function isRouteInsideCampus(campusId, routePoints) {
  return Array.isArray(routePoints)
    && routePoints.length >= 2
    && routePoints.every((point) => isPointInsideCampus(campusId, point))
}

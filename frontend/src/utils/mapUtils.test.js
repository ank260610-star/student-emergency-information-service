import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clampPointToViewportEdge,
  distanceToPolylineMeters,
  gcj02ToWgs84,
  geoPointToImageLatLng,
  imagePointToSimpleLatLng,
  markerPresentationForLocation,
  semanticZoomLevel,
  shouldShowPriority,
  wgs84ToGcj02,
} from './mapUtils.js'
import { campusTours, categoryMeta, getCampusLocations } from '../data/campusLocations.js'
import { findLandmarkNarrative } from '../data/landmarkNarratives.js'

test('converts top-left percentage coordinates to Leaflet simple coordinates', () => {
  assert.deepEqual(
    imagePointToSimpleLatLng({ x: 25, y: 20 }, { width: 1000, height: 500 }),
    [400, 250],
  )
})

test('projects a browser location into the campus guide image and rejects off-campus points', () => {
  const bounds = [[39, 117], [40, 119]]
  const imageSize = { width: 1000, height: 500 }

  assert.deepEqual(geoPointToImageLatLng([39.25, 117.5], bounds, imageSize), [125, 250])
  assert.equal(geoPointToImageLatLng([40.1, 117.5], bounds, imageSize), null)
})

test('converts a Tianjin GCJ-02 point before rendering on OSM tiles', () => {
  const point = gcj02ToWgs84([38.9865, 117.347034])
  assert.ok(point)
  assert.ok(Math.abs(point[0] - 38.9864) < 0.01)
  assert.ok(Math.abs(point[1] - 117.3470) < 0.01)
})

test('converts browser WGS-84 positions before requesting an AMap route', () => {
  const wgs84 = [38.9864, 117.347]
  const gcj02 = wgs84ToGcj02(wgs84)
  const recovered = gcj02ToWgs84(gcj02)

  assert.ok(Math.abs(recovered[0] - wgs84[0]) < 0.0001)
  assert.ok(Math.abs(recovered[1] - wgs84[1]) < 0.0001)
})

test('measures campus-scale deviation from a planned route', () => {
  const route = [[39.1, 117.16], [39.1, 117.17]]
  assert.ok(distanceToPolylineMeters([39.1, 117.165], route) < 1)
  assert.ok(distanceToPolylineMeters([39.1004, 117.165], route) > 30)
})

test('progressively reveals lower-priority locations as the map zooms in', () => {
  assert.equal(semanticZoomLevel(-1, -1), 0)
  assert.equal(semanticZoomLevel(0, -1), 1)
  assert.equal(semanticZoomLevel(1, -1), 2)
  assert.equal(semanticZoomLevel(2, -1), 3)
  assert.equal(shouldShowPriority(1, -1, -1), false)
  assert.equal(shouldShowPriority(1, 0, -1), true)
  assert.equal(shouldShowPriority(2, -1, -1), false)
  assert.equal(shouldShowPriority(2, 1, -1), true)
  assert.equal(shouldShowPriority(3, 2, -1), true)
})

test('keeps the hospital prominent and turns other locations from dots into numbers', () => {
  const ordinary = { priority: 3 }
  const hospital = { priority: 1, emergency: true }

  assert.equal(markerPresentationForLocation(hospital, 0, 0), 'hospital')
  assert.equal(markerPresentationForLocation(hospital, 3, 0), 'hospital')
  assert.equal(markerPresentationForLocation(ordinary, 0, 0), 'dot')
  assert.equal(markerPresentationForLocation(ordinary, 3, 0), 'number')
  assert.equal(markerPresentationForLocation(ordinary, 0, 0, { selected: true }), 'number')
  assert.equal(markerPresentationForLocation(ordinary, 0, 0, { forced: true }), 'number')
})

test('clamps offscreen points to a safe viewport edge and leaves visible points alone', () => {
  assert.equal(clampPointToViewportEdge({ x: 500, y: 300 }, 1000, 600, 50), null)
  assert.deepEqual(clampPointToViewportEdge({ x: 1200, y: 300 }, 1000, 600, 50), {
    x: 950,
    y: 300,
    angle: 0,
  })
})

test('keeps the complete Balitai 01–90 campus legend searchable with field-verified POIs', () => {
  const locations = getCampusLocations('balitai')
  const numbers = new Set(locations.map((location) => location.number))
  const expected = Array.from({ length: 90 }, (_, index) => String(index + 1).padStart(2, '0'))
  const verified = locations.filter((location) => location.geoSource === '现场采集 GCJ-02 入口坐标')

  assert.equal(locations.length, 101)
  assert.equal(numbers.size, 101)
  assert.ok(expected.every((number) => numbers.has(number)))
  assert.equal(verified.length, 25)
  assert.ok(verified.every((location) => location.geoPoint && location.navigationPoint))
  const eastGate = locations.find((location) => location.id === 'balitai-east-gate')
  assert.deepEqual(eastGate.navigationPoint, [39.1034, 117.178667])
  assert.ok(Math.abs(eastGate.geoPoint[0] - 39.102344) < 0.00001)
  assert.ok(Math.abs(eastGate.geoPoint[1] - 117.172328) < 0.00001)
  assert.ok(locations.every((location) => location.name && location.category))
  const narratedLandmarks = locations.filter((location) => location.landmarkNarrative)
  assert.equal(narratedLandmarks.length, 16)
  assert.ok(narratedLandmarks.every((location) => (
    location.landmarkNarrative.title && location.landmarkNarrative.brief && location.landmarkNarrative.facts
  )))
})

test('keeps the Balitai history tour ordered from east gate to west gate', () => {
  const locations = new Map(getCampusLocations('balitai').map((location) => [location.id, location]))
  const [tour, patriotic, publicAbility, striving] = campusTours.balitai

  assert.equal(campusTours.balitai.length, 4)
  assert.equal(tour.stopIds.at(0), 'balitai-east-gate')
  assert.equal(tour.stopIds.at(-1), 'balitai-location-89')
  assert.equal(tour.stopIds.length, 18)
  assert.ok(tour.stopIds.every((id) => locations.get(id)?.geoPoint))
  assert.ok([patriotic, publicAbility, striving].every((item) => (
    item.stopIds.at(0) === 'balitai-east-gate'
      && item.stopIds.at(-1) === 'balitai-location-89'
      && item.stopIds.every((id) => locations.get(id)?.geoPoint)
  )))
})

test('retrieves one matching landmark narrative for a campus-history question', () => {
  const narrative = findLandmarkNarrative('我想了解宁园的校史和陈省身故居的故事')
  assert.equal(narrative?.title, '陈省身故居')
  assert.equal(findLandmarkNarrative('从西门去校医院怎么走'), null)
})

test('keeps the complete Jinnan J01–J76 internal index searchable without inventing online coordinates', () => {
  const locations = getCampusLocations('jinnan')
  const internalLocations = locations.filter((location) => location.numberKind === 'internal')
  const numbers = new Set(internalLocations.map((location) => location.number))
  const expected = Array.from({ length: 76 }, (_, index) => `J${String(index + 1).padStart(2, '0')}`)
  const geocoded = locations.filter((location) => location.geoPoint)
  const fieldLocations = locations.filter((location) => location.numberKind === 'field')

  assert.equal(locations.length, 85)
  assert.equal(internalLocations.length, 76)
  assert.equal(numbers.size, 76)
  assert.ok(expected.every((number) => numbers.has(number)))
  assert.ok(internalLocations.every((location) => location.imagePoint && location.name && location.category))
  assert.equal(fieldLocations.length, 9)
  assert.ok(fieldLocations.every((location) => location.geoPoint && location.navigationPoint))
  assert.equal(geocoded.length, 28)
  assert.equal(locations.filter((location) => location.geoSource?.includes('openstreetmap.org')).length, 15)
  assert.equal(locations.filter((location) => location.emergency).length, 1)
})

test('keeps all campus records unique, categorized and inside their guide-map bounds', () => {
  const locations = [...getCampusLocations('balitai'), ...getCampusLocations('jinnan')]
  assert.equal(new Set(locations.map((location) => location.id)).size, locations.length)

  for (const location of locations) {
    assert.ok(categoryMeta[location.category], `${location.id} has an unknown category`)
    assert.ok([1, 2, 3].includes(location.priority), `${location.id} has an invalid priority`)
    assert.ok(location.description, `${location.id} has no description`)
    if (location.imagePoint) {
      assert.ok(location.imagePoint.x >= 0 && location.imagePoint.x <= 100, `${location.id} has an out-of-bounds x coordinate`)
      assert.ok(location.imagePoint.y >= 0 && location.imagePoint.y <= 100, `${location.id} has an out-of-bounds y coordinate`)
    } else {
      assert.ok(location.geoPoint, `${location.id} has no guide-image or verified online coordinate`)
    }
  }

  assert.equal(getCampusLocations('balitai').filter((location) => location.emergency).length, 1)
  assert.equal(getCampusLocations('jinnan').filter((location) => location.emergency).length, 1)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clampPointToViewportEdge,
  imagePointToSimpleLatLng,
  markerPresentationForLocation,
  semanticZoomLevel,
  shouldShowPriority,
} from './mapUtils.js'
import { categoryMeta, getCampusLocations } from '../data/campusLocations.js'

test('converts top-left percentage coordinates to Leaflet simple coordinates', () => {
  assert.deepEqual(
    imagePointToSimpleLatLng({ x: 25, y: 20 }, { width: 1000, height: 500 }),
    [400, 250],
  )
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

test('keeps the complete Balitai 01–90 campus legend searchable', () => {
  const locations = getCampusLocations('balitai')
  const numbers = new Set(locations.map((location) => location.number))
  const expected = Array.from({ length: 90 }, (_, index) => String(index + 1).padStart(2, '0'))

  assert.equal(locations.length, 90)
  assert.equal(numbers.size, 90)
  assert.ok(expected.every((number) => numbers.has(number)))
  assert.ok(locations.every((location) => location.imagePoint && location.name && location.category))
})

test('keeps the complete Jinnan J01–J74 internal index searchable without inventing online coordinates', () => {
  const locations = getCampusLocations('jinnan')
  const numbers = new Set(locations.map((location) => location.number))
  const expected = Array.from({ length: 74 }, (_, index) => `J${String(index + 1).padStart(2, '0')}`)
  const geocoded = locations.filter((location) => location.geoPoint)

  assert.equal(locations.length, 74)
  assert.equal(numbers.size, 74)
  assert.ok(expected.every((number) => numbers.has(number)))
  assert.ok(locations.every((location) => location.imagePoint && location.name && location.category && location.numberKind === 'internal'))
  assert.equal(geocoded.length, 15)
  assert.ok(geocoded.every((location) => location.geoSource?.includes('openstreetmap.org')))
  assert.equal(locations.filter((location) => location.emergency).length, 1)
})

test('keeps all campus records unique, categorized and inside their guide-map bounds', () => {
  const locations = [...getCampusLocations('balitai'), ...getCampusLocations('jinnan')]
  assert.equal(new Set(locations.map((location) => location.id)).size, locations.length)

  for (const location of locations) {
    assert.ok(categoryMeta[location.category], `${location.id} has an unknown category`)
    assert.ok([1, 2, 3].includes(location.priority), `${location.id} has an invalid priority`)
    assert.ok(location.description, `${location.id} has no description`)
    assert.ok(location.imagePoint.x >= 0 && location.imagePoint.x <= 100, `${location.id} has an out-of-bounds x coordinate`)
    assert.ok(location.imagePoint.y >= 0 && location.imagePoint.y <= 100, `${location.id} has an out-of-bounds y coordinate`)
  }

  assert.equal(getCampusLocations('balitai').filter((location) => location.emergency).length, 1)
  assert.equal(getCampusLocations('jinnan').filter((location) => location.emergency).length, 1)
})

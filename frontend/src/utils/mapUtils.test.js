import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import {
  bearingBetweenPoints,
  clampPointToViewportEdge,
  distanceToPolylineMeters,
  gcj02ToWgs84,
  geoPointToImageLatLng,
  imagePointToSimpleLatLng,
  markerPresentationForLocation,
  nextRouteManeuver,
  orderStopsFromNearestEndpoint,
  routeInstructionsFromGeometry,
  semanticZoomLevel,
  shouldShowPriority,
  wgs84ToGcj02,
} from './mapUtils.js'

test('calculates walking bearings clockwise from north', () => {
  assert.ok(Math.abs(bearingBetweenPoints([39, 117], [39.001, 117]) - 0) < 0.1)
  assert.ok(Math.abs(bearingBetweenPoints([39, 117], [39, 117.001]) - 90) < 0.1)
  assert.ok(Math.abs(bearingBetweenPoints([39, 117], [38.999, 117]) - 180) < 0.1)
  assert.equal(bearingBetweenPoints([39, 117], [39, 117]), null)
  assert.equal(bearingBetweenPoints(null, [39, 117]), null)
})

test('derives conservative text directions from route geometry', () => {
  const route = [
    [39, 117],
    [39.0003, 117],
    [39.0003, 116.9996],
    [39.0006, 116.9996],
  ]
  const instructions = routeInstructionsFromGeometry(route)
  assert.match(instructions[0], /向北方向出发/)
  assert.equal(instructions.some((step) => step.includes('左转')), true)
  assert.match(instructions.at(-1), /到达目的地/)
  assert.deepEqual(routeInstructionsFromGeometry([[39, 117]]), [])
})
import { campusTours, categoryMeta, getCampusLocations } from '../data/campusLocations.js'
import { findLandmarkNarrative } from '../data/landmarkNarratives.js'
import { findPlaceProfile } from '../data/placeProfiles.js'

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

test('converts a Tianjin GCJ-02 point for a WGS-84 map when needed', () => {
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

test('starts a campus tour from the endpoint nearest the live position', () => {
  const stops = [
    { id: 'west', geoPoint: [39.1, 117.15] },
    { id: 'middle', geoPoint: [39.1, 117.16] },
    { id: 'east', geoPoint: [39.1, 117.17] },
  ]
  const fromWest = orderStopsFromNearestEndpoint(stops, [39.1, 117.151])
  const fromEast = orderStopsFromNearestEndpoint(stops, [39.1, 117.169])

  assert.equal(fromWest.reversed, false)
  assert.deepEqual(fromWest.stops.map(({ id }) => id), ['west', 'middle', 'east'])
  assert.equal(fromEast.reversed, true)
  assert.deepEqual(fromEast.stops.map(({ id }) => id), ['east', 'middle', 'west'])
  assert.deepEqual(stops.map(({ id }) => id), ['west', 'middle', 'east'])
})

test('derives the next clear turn and remaining distance from route geometry', () => {
  const leftRoute = [
    [39.1, 117.16],
    [39.1, 117.1605],
    [39.1005, 117.1605],
  ]
  const rightRoute = [
    [39.1, 117.16],
    [39.1, 117.1605],
    [39.0995, 117.1605],
  ]

  const left = nextRouteManeuver([39.1, 117.1601], leftRoute)
  const right = nextRouteManeuver([39.1, 117.1601], rightRoute)
  assert.equal(left.type, 'left')
  assert.equal(left.label, '左转')
  assert.ok(left.distanceMeters > 20 && left.distanceMeters < 50)
  assert.equal(right.type, 'right')
  assert.equal(right.label, '右转')
  assert.equal(nextRouteManeuver([39.10049, 117.1605], leftRoute).type, 'arrive')
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
  assert.ok(campusTours.balitai.every((item) => item.introduction.length > 80))
  assert.ok(tour.stopIds.every((id) => locations.get(id)?.geoPoint))
  assert.ok([patriotic, publicAbility, striving].every((item) => (
    item.stopIds.at(0) === 'balitai-east-gate'
      && item.stopIds.at(-1) === 'balitai-location-89'
      && item.stopIds.every((id) => locations.get(id)?.geoPoint)
  )))
})

test('keeps the three Jinnan exploration routes ordered and routable', () => {
  const locations = new Map(getCampusLocations('jinnan').map((location) => [location.id, location]))
  const [history, relax, study] = campusTours.jinnan

  assert.equal(campusTours.jinnan.length, 3)
  assert.deepEqual(history.stopIds, [
    'jinnan-west-gate',
    'jinnan-location-j42',
    'jinnan-muzhai-library',
    'jinnan-tour-t01',
    'jinnan-tour-t02',
    'jinnan-student-center',
  ])
  assert.deepEqual(relax.stopIds, ['jinnan-location-j74', 'jinnan-gymnasium', 'jinnan-student-center'])
  assert.deepEqual(study.stopIds, ['jinnan-library', 'jinnan-tour-t03', 'jinnan-location-j72'])
  assert.ok(campusTours.jinnan.every((tour) => tour.introduction.length > 80))
  assert.ok(campusTours.jinnan.every((tour) => (
    tour.stopIds.length >= 2
      && tour.stopIds.every((id) => locations.get(id)?.geoPoint && locations.get(id)?.navigationPoint)
  )))
})

test('retrieves one matching landmark narrative for a campus-history question', () => {
  const narrative = findLandmarkNarrative('我想了解宁园的校史和陈省身故居的故事')
  assert.equal(narrative?.title, '陈省身故居')
  assert.equal(findLandmarkNarrative('从西门去校医院怎么走'), null)
})

test('retrieves reviewed college and building profiles for campus introductions', () => {
  assert.equal(findPlaceProfile('金融学院是做什么的？')?.title, '金融学院')
  assert.equal(findPlaceProfile('介绍一下津南公教楼')?.title, '公共教学楼A')
  assert.equal(findPlaceProfile('从西门去食堂怎么走'), null)

  const jinnanLocations = getCampusLocations('jinnan')
  const financeCollege = jinnanLocations.find((location) => location.number === 'J37')
  assert.equal(financeCollege?.placeProfile?.kind, '学院建筑')
  assert.ok(financeCollege?.geoPoint)
  assert.ok(financeCollege?.placeProfile?.sources.some((source) => source.type === '官网'))
  assert.ok(financeCollege?.placeProfile?.sources.some((source) => source.type === '公众号'))
})

test('keeps the complete Jinnan index searchable and exposes every collected POI online', () => {
  const locations = getCampusLocations('jinnan')
  const internalLocations = locations.filter((location) => location.numberKind === 'internal')
  const numbers = new Set(internalLocations.map((location) => location.number))
  const expected = Array.from({ length: 76 }, (_, index) => `J${String(index + 1).padStart(2, '0')}`)
  const geocoded = locations.filter((location) => location.geoPoint)
  const fieldLocations = locations.filter((location) => location.numberKind === 'field')

  assert.equal(locations.length, 93)
  assert.equal(internalLocations.length, 76)
  assert.equal(numbers.size, 76)
  assert.ok(expected.every((number) => numbers.has(number)))
  assert.ok(internalLocations.every((location) => location.imagePoint && location.name && location.category))
  assert.equal(fieldLocations.length, 14)
  assert.ok(fieldLocations.every((location) => location.geoPoint && location.navigationPoint))
  assert.equal(geocoded.length, 55)
  assert.equal(locations.filter((location) => location.geoSource === '现场采集 GCJ-02 入口坐标').length, 41)
  assert.equal(locations.filter((location) => location.geoSource?.includes('openstreetmap.org')).length, 7)
  assert.equal(locations.filter((location) => location.emergency).length, 1)

  const publicTeachingA = locations.find((location) => location.number === 'J66')
  assert.deepEqual(publicTeachingA.navigationPoint, [38.987653, 117.345338])
  assert.deepEqual(publicTeachingA.entryPoints[0], [38.987653, 117.345338])
  assert.ok(['南开大学品牌文化店', '肯德基', '理科打印店', '理科快递站', '物美品超市']
    .every((name) => locations.some((location) => location.name === name && location.geoPoint)))
})

test('connects the submitted Jinnan place photos to searchable campus locations', () => {
  const locations = getCampusLocations('jinnan')
  const photos = locations.flatMap((location) => location.photos || [])
  const searchableNames = new Set(locations.flatMap((location) => [location.name, ...(location.aliases || [])]))

  assert.equal(locations.filter((location) => location.photos?.length).length, 37)
  assert.equal(photos.length, 69)
  assert.equal(new Set(photos.map((photo) => photo.src)).size, photos.length)
  assert.ok(['国际教育学院', '社会学院', '人工智能学院', '西楼报告厅'].every((name) => searchableNames.has(name)))

  const photoCaptions = Object.fromEntries(locations.map((location) => [
    location.name,
    (location.photos || []).map((photo) => photo.caption),
  ]))
  assert.ok(photoCaptions['公共教学楼C'].includes('公共教学楼C区入口'))
  assert.ok(photoCaptions['公共教学楼D'].includes('公共教学楼D区入口'))
  assert.ok(photoCaptions['综合实验楼B'].includes('综合实验楼B区入口'))
  assert.ok(photoCaptions['综合实验楼D'].includes('综合实验楼D区入口'))
  assert.ok(photoCaptions['快递站'].includes('文科生活组团快递站'))
  assert.ok(photoCaptions['理科快递站'].includes('理科生活组团快递站'))

  for (const photo of photos) {
    assert.ok(photo.src.startsWith('/images/jinnan-places/'))
    assert.ok(photo.alt && photo.caption)
    assert.ok(existsSync(new URL(`../../public${photo.src}`, import.meta.url)), `${photo.src} is missing`)
  }
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

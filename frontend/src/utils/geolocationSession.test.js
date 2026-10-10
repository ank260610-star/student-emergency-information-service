import assert from 'node:assert/strict'
import test from 'node:test'
import { createGeolocationSession } from './geolocationSession.js'

function setup(options = {}) {
  const watches = []
  const locations = []
  const cleared = []
  const liveChanges = []
  const positions = []
  const statuses = []
  const geolocation = {
    watchPosition(success, error) {
      watches.push({ success, error })
      return watches.length - 1
    },
    clearWatch(id) { cleared.push(id) },
    getCurrentPosition(success, error) { locations.push({ success, error }) },
  }
  const session = createGeolocationSession({
    geolocation,
    secureContext: true,
    onPosition: (position) => positions.push(position),
    onLiveChange: (live) => liveChanges.push(live),
    onStatus: (status) => statuses.push(status),
    ...options,
  })
  return { session, watches, locations, cleared, liveChanges, positions, statuses }
}

test('denied live permission closes the watch and resets the navigation control', () => {
  const state = setup()
  assert.equal(state.session.start(), true)
  state.watches[0].error({ code: 1 })
  assert.deepEqual(state.cleared, [0])
  assert.deepEqual(state.liveChanges, [true, false])
  state.watches[0].success({ stale: true })
  assert.deepEqual(state.positions, [])
})

test('suspension releases GPS, ignores queued positions, and resumes one watch', () => {
  const state = setup()
  state.session.start()
  state.session.start()
  assert.equal(state.watches.length, 1)
  state.session.suspend()
  state.watches[0].success({ stale: true })
  state.session.resume()
  state.session.resume()
  state.watches[1].success({ current: true })
  assert.equal(state.watches.length, 2)
  assert.deepEqual(state.cleared, [0])
  assert.deepEqual(state.liveChanges, [true])
  assert.deepEqual(state.positions, [{ current: true }])
})

test('stopped sessions cannot restart when the page returns', () => {
  const state = setup()
  state.session.start()
  state.session.suspend()
  state.session.stop()
  state.session.resume()
  assert.equal(state.watches.length, 1)
  assert.deepEqual(state.liveChanges, [true, false])
})

test('a new location request supersedes old results and errors', () => {
  const state = setup()
  const results = []
  state.session.locate((value) => results.push(value))
  state.session.locate((value) => results.push(value))
  const statusCount = state.statuses.length
  state.locations[0].success('old')
  state.locations[0].error({ code: 1 })
  state.locations[1].success('new')
  assert.deepEqual(results, ['new'])
  assert.equal(state.statuses.length, statusCount)
})

test('map changes and disposal invalidate pending one-time positioning', () => {
  const state = setup()
  const results = []
  state.session.locate((value) => results.push(value))
  state.session.invalidateLocation()
  state.locations[0].success('previous map')
  state.session.locate((value) => results.push(value))
  state.session.start()
  state.session.dispose()
  state.locations[1].success('disposed')
  state.watches[0].success('disposed')
  assert.deepEqual(results, [])
  assert.deepEqual(state.positions, [])
  assert.equal(state.session.start(), false)
})

test('unavailable and insecure contexts report a reason without enabling navigation', () => {
  for (const options of [{ geolocation: null }, { secureContext: false }]) {
    const state = setup(options)
    assert.equal(state.session.start(), false)
    assert.deepEqual(state.liveChanges, [])
    assert.equal(state.statuses.length, 1)
  }
})

test('a transient timeout keeps the watch available for a later position', () => {
  const state = setup()
  state.session.start()
  state.watches[0].error({ code: 3 })
  state.watches[0].success({ recovered: true })
  assert.deepEqual(state.liveChanges, [true])
  assert.deepEqual(state.positions, [{ recovered: true }])
})

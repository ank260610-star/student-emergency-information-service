import test from 'node:test'
import assert from 'node:assert/strict'
import { measureMobileViewport } from './mobileViewport.js'

test('uses the visual viewport for embedded mobile browser height', () => {
  assert.deepEqual(measureMobileViewport({
    innerHeight: 760,
    clientHeight: 760,
    visualViewport: { height: 680, offsetTop: 0 },
  }), {
    layoutHeight: 760,
    viewportHeight: 680,
    viewportOffsetTop: 0,
    keyboardInset: 80,
    keyboardOpen: false,
    mapHeight: 381,
  })
})

test('detects a software keyboard and clamps the compact map height', () => {
  assert.deepEqual(measureMobileViewport({
    innerHeight: 844,
    clientHeight: 844,
    visualViewport: { height: 430.4, offsetTop: 8 },
  }), {
    layoutHeight: 844,
    viewportHeight: 430,
    viewportOffsetTop: 8,
    keyboardInset: 406,
    keyboardOpen: true,
    mapHeight: 340,
  })
})

test('falls back to the layout viewport when visualViewport is unavailable', () => {
  assert.deepEqual(measureMobileViewport({ innerHeight: 667, clientHeight: 650 }), {
    layoutHeight: 667,
    viewportHeight: 667,
    viewportOffsetTop: 0,
    keyboardInset: 0,
    keyboardOpen: false,
    mapHeight: 374,
  })
})

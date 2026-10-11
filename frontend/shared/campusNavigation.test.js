import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isPointInsideCampus,
  isRouteInsideCampus,
  parseLongitudeLatitude,
} from './campusNavigation.js'

test('parses AMap longitude-latitude coordinates', () => {
  assert.deepEqual(parseLongitudeLatitude('117.178667,39.103400'), [39.1034, 117.178667])
  assert.equal(parseLongitudeLatitude('not-a-coordinate'), null)
})

test('keeps same-name campus points inside their selected campus fence', () => {
  assert.equal(isPointInsideCampus('balitai', [39.1034, 117.178667]), true)
  assert.equal(isPointInsideCampus('jinnan', [39.1034, 117.178667]), false)
  assert.equal(isPointInsideCampus('jinnan', [38.987655, 117.345517]), true)
  assert.equal(isPointInsideCampus('balitai', [38.987655, 117.345517]), false)
})

test('rejects an AMap route as soon as any track point leaves campus', () => {
  assert.equal(isRouteInsideCampus('balitai', [
    [39.1034, 117.178667],
    [39.102909, 117.171207],
    [39.106113, 117.156348],
  ]), true)
  assert.equal(isRouteInsideCampus('balitai', [
    [39.1034, 117.178667],
    [39.095, 117.168],
    [39.106113, 117.156348],
  ]), false)
})

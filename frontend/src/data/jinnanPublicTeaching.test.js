import test from 'node:test'
import assert from 'node:assert/strict'
import { campusConfigs, getCampusLocations } from './campusLocations.js'
import { findDestinationCandidates } from '../services/nkZhixingNavigation.js'

test('Jinnan public teaching A keeps its explicit label and legacy aliases', () => {
  const activeCampus = { ...campusConfigs.jinnan, locations: getCampusLocations('jinnan') }
  const publicTeachingA = findDestinationCandidates('去公教A', activeCampus)
  assert.equal(publicTeachingA.length, 1)
  assert.equal(publicTeachingA[0].name, '公共教学楼A')
  assert.deepEqual(publicTeachingA[0].navigationPoint, [38.987653, 117.345338])
  assert.deepEqual(publicTeachingA[0].entryPoints[0], [38.987653, 117.345338])
  assert.deepEqual(findDestinationCandidates('去公共教学楼', activeCampus).map(({ id }) => id), ['jinnan-public-teaching'])
})

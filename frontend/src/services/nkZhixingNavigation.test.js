import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAgentInstructions,
  extractNavigationDestination,
  findDestinationCandidates,
  findLocationMatches,
  findOrigin,
  isNavigationPoint,
} from './nkZhixingNavigation.js'

const campus = {
  id: 'jinnan', name: '津南校区',
  locations: [
    { id: 'sw', name: '西南门' },
    { id: 's', name: '南门' },
    { id: 'lib', name: '中心图书馆', aliases: ['图书馆'] },
    { id: 'lib2', name: '科学图书馆', aliases: ['图书馆'] },
    { id: 'jinnan-public-teaching', name: '公共教学楼', aliases: ['公教楼'] },
  ],
}

test('question suffixes keep a destination instead of splitting it away', () => {
  assert.equal(extractNavigationDestination('图书馆怎么去？'), '图书馆')
  assert.equal(extractNavigationDestination('从西南门到 中心图书馆 怎么走？'), '中心图书馆')
  assert.equal(extractNavigationDestination('怎么去校医院？'), '校医院')
  assert.equal(extractNavigationDestination('思源堂的历史是什么？'), '')
})

test('overlapping gate names do not create a false origin', () => {
  assert.deepEqual(findLocationMatches('去西南门', campus).map(({ location }) => location.id), ['sw'])
  assert.equal(findOrigin('去西南门', campus.locations[0], campus), null)
  assert.equal(findOrigin('从西南门去中心图书馆', campus.locations[2], campus).id, 'sw')
})

test('keeps an explicit known origin when the destination needs an external lookup', () => {
  assert.equal(findOrigin('从西南门去实验新楼', null, campus).id, 'sw')
})

test('candidate selection uses the destination, preserves ambiguity, and prefers exact names', () => {
  assert.deepEqual(findDestinationCandidates('从西南门去图书馆', campus).map((item) => item.id), ['lib', 'lib2'])
  assert.deepEqual(findDestinationCandidates('去中心图书馆', campus).map((item) => item.id), ['lib'])
  assert.deepEqual(findDestinationCandidates('去公教', campus).map((item) => item.id), ['jinnan-public-teaching'])
  assert.deepEqual(findDestinationCandidates('从西南门去实验新楼', campus), [])
})

test('request instructions include the confirmed destination and selected mode', () => {
  const instructions = buildAgentInstructions({ campus, mode: 'bicycling', navigationIntent: true, destination: campus.locations[2], liveOrigin: [39, 117] })
  assert.match(instructions, /用户已确认目的地：中心图书馆/)
  assert.match(instructions, /出行方式：骑行/)
  assert.match(instructions, /经度 117\.000000，纬度 39\.000000/)
  const narration = buildAgentInstructions({ campus, mode: 'walking', narrative: { title: '思源堂', brief: '简介', facts: '事实' } })
  assert.match(narration, /本站整理的校史材料/)
  assert.doesNotMatch(narration, /网页导航协同/)
})

test('navigation coordinates must be finite latitude/longitude pairs', () => {
  assert.equal(isNavigationPoint([39, 117]), true)
  for (const point of [null, [], [39], [39, 117, 1], [91, 117], [39, 181], [NaN, 117], ['39', 117]]) {
    assert.equal(isNavigationPoint(point), false)
  }
})

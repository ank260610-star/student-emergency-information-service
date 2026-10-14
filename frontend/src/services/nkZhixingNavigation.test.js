import test from 'node:test'
import assert from 'node:assert/strict'
import { campusConfigs, getCampusLocations } from '../data/campusLocations.js'
import {
  buildAgentInstructions,
  findRequestedTravelMode,
  extractNavigationDestination,
  extractNavigationOrigin,
  findDestinationCandidates,
  findLocationMatches,
  findOrigin,
  isNavigationRequest,
  isNavigationPoint,
  isNamedFacilityGate,
  isPointNearCampus,
  refersToCurrentPosition,
} from './nkZhixingNavigation.js'

test('detects the latest explicit travel mode in a navigation request', () => {
  assert.equal(findRequestedTravelMode('骑车去图书馆'), 'bicycling')
  assert.equal(findRequestedTravelMode('我要开车去校医院'), 'driving')
  assert.equal(findRequestedTravelMode('从西南门走路去食堂'), 'walking')
  assert.equal(findRequestedTravelMode('先骑车，之后改为步行'), 'walking')
  assert.equal(findRequestedTravelMode('去中心图书馆'), '')
  assert.equal(findRequestedTravelMode('腿着去图书馆'), 'walking')
  assert.equal(findRequestedTravelMode('骑小电驴去食堂'), 'bicycling')
  assert.equal(findRequestedTravelMode('打车去校医院'), 'driving')
})

test('recognizes conversational navigation requests', () => {
  for (const request of ['图书馆咋走', '中心图书馆怎么过去啊', '带我去文科食堂吧', '校医院离我多远']) {
    assert.equal(isNavigationRequest(request), true)
  }
  assert.equal(isNavigationRequest('思源堂的历史是什么'), false)
})

test('treats natural current-location phrases as the live starting point', () => {
  for (const request of [
    '从我的位置出发去图书馆',
    '从这里出发去文科食堂',
    '以我的位置为起点前往东门',
    '从我所在的位置导航到体育馆',
    '从我这边去图书馆',
    '就从这出发去文科食堂',
  ]) {
    assert.equal(refersToCurrentPosition(request), true)
  }
  assert.equal(refersToCurrentPosition('从西门出发去图书馆'), false)
})

const campus = {
  id: 'jinnan', name: '津南校区',
  locations: [
    { id: 'sw', name: '西南门' },
    { id: 's', name: '南门' },
    { id: 'lib', name: '中心图书馆', aliases: ['图书馆'] },
    { id: 'lib2', name: '科学图书馆', aliases: ['图书馆'] },
    { id: 'jinnan-public-teaching', name: '公共教学楼', aliases: ['公教楼'] },
    { id: 'dorm-1a', name: '学1-A', aliases: ['学生宿舍学1-A'] },
  ],
}

const balitaiCampus = {
  id: 'balitai', name: '八里台校区',
  locations: [
    { id: 'east', name: '东门' },
    { id: 'south', name: '南门' },
    { id: 'business', name: '商学院大楼', aliases: ['商学院'] },
  ],
}

test('question suffixes keep a destination instead of splitting it away', () => {
  assert.equal(extractNavigationDestination('图书馆怎么去？'), '图书馆')
  assert.equal(extractNavigationDestination('从西南门到 中心图书馆 怎么走？'), '中心图书馆')
  assert.equal(extractNavigationDestination('怎么去校医院？'), '校医院')
  assert.equal(extractNavigationDestination('思源堂的历史是什么？'), '')
  assert.equal(extractNavigationDestination('图书馆咋走？'), '图书馆')
  assert.equal(extractNavigationDestination('我在西南门，中心图书馆咋走？'), '中心图书馆')
  assert.equal(extractNavigationDestination('西南门出发，带我去中心图书馆吧'), '中心图书馆')
  assert.equal(extractNavigationDestination('中心图书馆怎么过去啊'), '中心图书馆')
  assert.equal(extractNavigationDestination('中心图书馆离我多远'), '中心图书馆')
})

test('extracts an explicit named-facility gate as an external origin', () => {
  assert.equal(extractNavigationOrigin('从商学院东门去图书馆'), '商学院东门')
  assert.equal(extractNavigationOrigin('去图书馆'), '')
  assert.equal(extractNavigationOrigin('我在西南门，中心图书馆咋走'), '西南门')
  assert.equal(extractNavigationOrigin('从西南门出发，带我去中心图书馆'), '西南门')
  assert.equal(isNamedFacilityGate('商学院的东门'), true)
  assert.equal(isNamedFacilityGate('学校东门'), false)
})

test('overlapping gate names do not create a false origin', () => {
  assert.deepEqual(findLocationMatches('去西南门', campus).map(({ location }) => location.id), ['sw'])
  assert.equal(findOrigin('去西南门', campus.locations[0], campus), null)
  assert.equal(findOrigin('从西南门去中心图书馆', campus.locations[2], campus).id, 'sw')
})

test('unqualified Balitai gates mean campus gates, while named facility gates do not', () => {
  assert.deepEqual(findDestinationCandidates('去东门', balitaiCampus).map((item) => item.id), ['east'])
  assert.deepEqual(findDestinationCandidates('去学校东门', balitaiCampus).map((item) => item.id), ['east'])
  assert.deepEqual(findDestinationCandidates('去南开大学八里台校区南门', balitaiCampus).map((item) => item.id), ['south'])
  assert.deepEqual(findDestinationCandidates('去商学院东门', balitaiCampus), [])
  assert.deepEqual(findDestinationCandidates('从商学院的东门去南门', balitaiCampus).map((item) => item.id), ['south'])
  assert.equal(findOrigin('从商学院东门去南门', balitaiCampus.locations[1], balitaiCampus), null)
})

test('keeps an explicit known origin when the destination needs an external lookup', () => {
  assert.equal(findOrigin('从西南门去实验新楼', null, campus).id, 'sw')
})

test('candidate selection uses the destination, preserves ambiguity, and prefers exact names', () => {
  assert.deepEqual(findDestinationCandidates('从西南门去图书馆', campus).map((item) => item.id), ['lib', 'lib2'])
  assert.deepEqual(findDestinationCandidates('去中心图书馆', campus).map((item) => item.id), ['lib'])
  assert.deepEqual(findDestinationCandidates('去公教', campus).map((item) => item.id), ['jinnan-public-teaching'])
  assert.deepEqual(findDestinationCandidates('从西南门去实验新楼', campus), [])
  assert.deepEqual(findDestinationCandidates('我在西南门，中心图书馆咋走', campus).map((item) => item.id), ['lib'])
  assert.deepEqual(findDestinationCandidates('去图书倌', campus).map((item) => item.id), ['lib', 'lib2'])
  assert.deepEqual(findDestinationCandidates('去学一A', campus).map((item) => item.id), ['dorm-1a'])
})

test('short campus navigation commands resolve reviewed POI aliases', () => {
  const campusWithReviewedAliases = {
    id: 'jinnan', name: '津南校区',
    locations: [
      { id: 'finance', name: '金融学院', aliases: ['南开大学金融学院', '金院'] },
      { id: 'teaching-a', name: '公共教学楼', aliases: ['公教', '公教A', '教学楼A', '公共教学楼A'] },
    ],
  }
  assert.deepEqual(findDestinationCandidates('去金融学院', campusWithReviewedAliases).map(({ id }) => id), ['finance'])
  assert.deepEqual(findDestinationCandidates('去公教A', campusWithReviewedAliases).map(({ id }) => id), ['teaching-a'])
})

test('representative campus navigation phrases resolve within the active campus', () => {
  const cases = {
    jinnan: [
      ['去中心图书馆', 'jinnan-library'],
      ['带我去文科食堂', 'jinnan-location-j10'],
      ['去体育馆', 'jinnan-gymnasium'],
      ['去金融学院', 'jinnan-location-j37'],
      ['去公教A', 'jinnan-public-teaching'],
      ['去公共教学楼B', 'jinnan-field-p01'],
      ['去学5-A', 'jinnan-location-j58'],
      ['去西南门', 'jinnan-southwest-gate'],
      ['去大通学活', 'jinnan-student-center'],
      ['去宁一书斋', 'jinnan-tour-t03'],
      ['去人工智能学院', 'jinnan-location-j46'],
      ['去前沿交叉楼', 'jinnan-location-j72'],
      ['去马蹄湖文科小花园', 'jinnan-location-j74'],
    ],
    balitai: [
      ['去东门', 'balitai-east-gate'],
      ['去西门', 'balitai-location-89'],
      ['去主楼', 'balitai-main-building'],
      ['去思源堂', 'balitai-location-05'],
      ['去马蹄湖', 'balitai-mati-lake'],
      ['去商学院', 'balitai-location-87'],
      ['去校医院', 'balitai-hospital'],
      ['去周恩来总理像', 'balitai-zhou-enlai-statue'],
      ['去西南联大纪念碑', 'balitai-memorial'],
      ['去陈省身故居', 'balitai-chen-shengshen-residence'],
      ['去爱国三问碑', 'balitai-patriotic-three-questions'],
      ['去校钟', 'balitai-location-11'],
    ],
  }

  for (const [campusId, prompts] of Object.entries(cases)) {
    const activeCampus = { ...campusConfigs[campusId], locations: getCampusLocations(campusId) }
    for (const [prompt, expectedId] of prompts) {
      assert.deepEqual(
        findDestinationCandidates(prompt, activeCampus).map(({ id }) => id),
        [expectedId],
        `${campusId}: ${prompt}`,
      )
    }
  }
})

test('request instructions include the confirmed destination and selected mode', () => {
  const instructions = buildAgentInstructions({ campus, mode: 'bicycling', navigationIntent: true, destination: campus.locations[2], liveOrigin: [39, 117], prompt: '从西南门去中心图书馆' })
  assert.match(instructions, /用户已确认目的地：中心图书馆/)
  assert.match(instructions, /用户已选择出行方式：骑行/)
  assert.match(instructions, /西南门（津南校区）/)
  assert.match(instructions, /中心图书馆（津南校区）/)
  assert.match(instructions, /禁止替换为另一校区同名 POI/)
  assert.match(instructions, /经度 117\.000000，纬度 39\.000000/)
  assert.match(instructions, /自然语言理解/)
  const narration = buildAgentInstructions({ campus, mode: 'walking', narrative: { title: '思源堂', brief: '简介', facts: '事实' } })
  assert.match(narration, /本站审核的地点资料/)
  assert.doesNotMatch(narration, /网页导航协同/)
  assert.match(buildAgentInstructions({ campus: balitaiCampus, mode: 'walking', navigationIntent: true }), /八里台校门规则/)
})

test('navigation coordinates must be finite latitude/longitude pairs', () => {
  assert.equal(isNavigationPoint([39, 117]), true)
  for (const point of [null, [], [39], [39, 117, 1], [91, 117], [39, 181], [NaN, 117], ['39', 117]]) {
    assert.equal(isNavigationPoint(point), false)
  }
})

test('navigation coordinates are rejected when they belong to another campus', () => {
  const jinnanCenter = [38.99, 117.34]
  assert.equal(isPointNearCampus([38.992, 117.341], jinnanCenter), true)
  assert.equal(isPointNearCampus([39.106, 117.156], jinnanCenter), false)
  assert.equal(isPointNearCampus(null, jinnanCenter), false)
})

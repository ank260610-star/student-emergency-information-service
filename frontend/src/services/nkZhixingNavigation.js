export const travelModeLabels = {
  walking: '步行',
  bicycling: '骑行',
  driving: '驾车',
}

const travelModePatterns = {
  walking: /(?:步行|走路|徒步)/g,
  bicycling: /(?:骑行|骑车|自行车|单车|电动车)/g,
  driving: /(?:驾车|开车|自驾)/g,
}

const campusAliases = { jinnan: { 'jinnan-public-teaching': ['公教'] } }
const normalize = (value) => String(value || '').toLowerCase().replace(/\s/g, '')
const genericGatePattern = /(?:东北门|东南门|西北门|西南门|东门|西门|南门|北门)$/
const facilityGateOwnerPattern = /(?:学院|书院|图书馆|体育馆|医院|食堂|宿舍|教学楼|实验楼|办公楼|主楼|中心|大楼|楼|馆|园|场|室)(?:的)?$/
const namedFacilityGatePattern = /(?:学院|书院|图书馆|体育馆|医院|食堂|宿舍|教学楼|实验楼|办公楼|主楼|中心|大楼|楼|馆|园|场|室)(?:的)?(?:东北门|东南门|西北门|西南门|东门|西门|南门|北门)$/

function isGenericGateInsideNamedFacility(text, index, alias) {
  if (!genericGatePattern.test(alias)) return false
  return facilityGateOwnerPattern.test(text.slice(0, index))
}

export function isNamedFacilityGate(value) {
  return namedFacilityGatePattern.test(normalize(value))
}

export function isNavigationRequest(value) {
  return /(?:前往|抵达|到|去|怎么走|怎么去|如何去|导航|路线)/.test(String(value || ''))
}

export function findRequestedTravelMode(value) {
  const text = normalize(value)
  let selected = null
  for (const [mode, pattern] of Object.entries(travelModePatterns)) {
    pattern.lastIndex = 0
    for (const match of text.matchAll(pattern)) {
      if (!selected || match.index > selected.index) selected = { mode, index: match.index }
    }
  }
  return selected?.mode || ''
}

export function extractNavigationDestination(value) {
  const text = String(value || '').replace(/\s/g, '')
  if (!text || !isNavigationRequest(text)) return ''
  // Strip trailing questions before splitting, so “图书馆怎么去” keeps its destination.
  const statement = text.replace(/(?:怎么走|怎么去|如何去|导航|路线|在哪里|在哪儿|在哪)[？?。！!]*$/, '')
  const parts = statement.split(/(?:前往|抵达|到|去)/)
  return (parts[parts.length - 1] || '')
    .replace(/^(?:一下|往|校园内|校内)/, '')
    .replace(/(?:怎么走|怎么去|如何去|导航|路线|在哪里|在哪儿|在哪|[？?。！!，,]).*/, '')
    .trim().slice(0, 80)
}

export function extractNavigationOrigin(value) {
  const text = String(value || '').replace(/\s/g, '')
  const separator = text.match(/(?:前往|抵达|到|去)/)
  if (!separator || separator.index === 0) return ''
  return text.slice(0, separator.index)
    .replace(/^(?:从|由|我在|起点是?)/, '')
    .replace(/[，,。！!？?].*/, '')
    .trim().slice(0, 80)
}

export function findLocationMatches(text, campus) {
  const normalizedText = normalize(text)
  const matches = (campus.locations || []).flatMap((location) => {
    const aliases = [location.name, ...(location.aliases || []), ...(campusAliases[campus.id]?.[location.id] || [])]
    const found = aliases.map(normalize).filter(Boolean).map((alias) => ({
      index: normalizedText.lastIndexOf(alias),
      aliasLength: alias.length,
      alias,
    })).filter((match) => match.index >= 0
      && !isGenericGateInsideNamedFacility(normalizedText, match.index, match.alias))
      .sort((left, right) => right.aliasLength - left.aliasLength || right.index - left.index)[0]
    return found ? [{ location, ...found }] : []
  })
  // “南门” inside “西南门” must not become a second origin or destination.
  return matches.filter((match) => !matches.some((other) => other.aliasLength > match.aliasLength
    && other.index <= match.index
    && other.index + other.aliasLength >= match.index + match.aliasLength))
    .sort((left, right) => left.index - right.index)
}

export function findDestination(text, campus) {
  const matches = findLocationMatches(text, campus)
  return matches[matches.length - 1]?.location || null
}

export function findDestinationCandidates(text, campus) {
  const destinationText = extractNavigationDestination(text) || text
  const matches = findLocationMatches(destinationText, campus)
    .filter((match) => !isNamedFacilityGate(destinationText)
      || genericGatePattern.test(match.alias))
  const longest = Math.max(0, ...matches.map((match) => match.aliasLength))
  const locations = matches.filter((match) => match.aliasLength === longest).map((match) => match.location)
  if (locations.length) return [...new Map(locations.map((location) => [location.id, location])).values()]

  const term = ['图书馆', '食堂', '宿舍', '体育馆', '教学楼', '校门', '大门', '医院', '广场']
    .find((item) => destinationText.includes(item))
  return term ? (campus.locations || []).filter((location) => location.name.includes(term)) : []
}

export function findOrigin(text, destination, campus) {
  const originText = String(text || '').split(/(?:前往|抵达|到|去)/)[0]
  if (originText !== text) {
    const explicitOrigin = findLocationMatches(originText, campus)
      .filter((match) => !isNamedFacilityGate(originText) || genericGatePattern.test(match.alias))
      .find(({ location }) => location.id !== destination?.id)?.location
    return explicitOrigin || null
  }
  const matches = findLocationMatches(text, campus)
  const origin = matches.find(({ location }) => location.id !== destination?.id)?.location || null
  return matches.length > 1 ? origin : null
}

export function refersToCurrentPosition(value) {
  const text = normalize(value)
  return /(?:我的位置|当前位置|从我这里|从我这儿|从这里|我所在的位置|以我(?:的)?位置为起点)/.test(text)
}

export function requestsLandmarkHistory(value) {
  return /(历史|校史|故事|来历|介绍|讲解|建造|建筑|人物|纪念|为什么|意义|背景|何时|谁|是什么|什么)/.test(value)
}

export function isNavigationPoint(point) {
  return Array.isArray(point) && point.length === 2
    && point.every(Number.isFinite)
    && Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180
}

export function isPointNearCampus(point, geoCenter, maximumDistanceMeters = 8000) {
  if (!isNavigationPoint(point) || !isNavigationPoint(geoCenter)) return false
  const [latitude, longitude] = point
  const [campusLatitude, campusLongitude] = geoCenter
  const latitudeMeters = (latitude - campusLatitude) * 111320
  const longitudeMeters = (longitude - campusLongitude) * 111320
    * Math.cos(campusLatitude * Math.PI / 180)
  return Math.hypot(latitudeMeters, longitudeMeters) <= maximumDistanceMeters
}

export function buildAgentInstructions({ campus, narrative, navigationIntent, liveOrigin, mode, destination, prompt = '' }) {
  const instructions = [`【当前校区已确定】用户正在查看${campus.name}地图。未明确提出跨校区时，用户提到的所有校门、建筑、教学楼、图书馆、食堂、宿舍、场馆和地标均只允许在${campus.name}地点库内解析；不得使用另一校区的同名或相似地点，也不要再次询问用户所在校区。`]
  if (campus.id === 'balitai') {
    instructions.push('【八里台校门规则】用户只说“东门”“西门”“南门”“北门”或带方向的“××门”，且未明确说明属于某学院、场馆或建筑时，一律按南开大学八里台校区的学校大门理解；只有用户明说“某学院/某建筑××门”时，才按该单位入口理解。')
  }
  if (navigationIntent) {
    const matchedLocations = [...new Map(findLocationMatches(prompt, campus)
      .map(({ location }) => [location.id, location])).values()]
    instructions.push(`【网页导航协同】用户已选择出行方式：${travelModeLabels[mode]}；不得回答“未选择出行方式”。${destination ? `用户已确认目的地：${destination.name}。` : ''}请说明建议的起点和终点；不要自行估算距离、时长或给出分步路线，由网站依据已确认地点生成路线图。路线只允许使用${campus.name}校内道路，不得建议出校绕行；若校内道路不可达，应明确说明无法提供校内路线。`)
    if (matchedLocations.length) {
      instructions.push(`【当前校区地点消歧】本次识别到：${matchedLocations.map((location) => `${location.name}（${campus.name}）`).join('、')}。这些地点均已由网页按当前校区限定，禁止替换为另一校区同名 POI。`)
    }
    if (liveOrigin) instructions.push(`【本次导航起点】当前位置（GCJ-02）：经度 ${liveOrigin[1].toFixed(6)}，纬度 ${liveOrigin[0].toFixed(6)}。`)
  }
  if (narrative) {
    const sources = narrative.sources?.map((source) => `${source.type}：${source.label}`).join('；')
    instructions.push(`【地点检索资料】命中地点：${narrative.title}。类型：${narrative.kind || '校史地标'}。简介：${narrative.brief}。事实资料：${narrative.facts}${sources ? `。可参考入口：${sources}` : ''}\n【答复要求】仅依据上述资料，用自然、克制的校园讲解口吻回答用户问题；不要新增具体年份、尺寸、人物经历、建筑功能、开放安排或无法核验的细节。不要规划路线，也不要询问校区。末尾另起一行标注“【资料依据】本站审核的地点资料”。不得声称已经实时读取官网或公众号正文。`)
  }
  return instructions.join('\n')
}

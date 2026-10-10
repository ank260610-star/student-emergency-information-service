export const travelModeLabels = {
  walking: '步行',
  bicycling: '骑行',
  driving: '驾车',
}

const campusAliases = { jinnan: { 'jinnan-public-teaching': ['公教'] } }
const normalize = (value) => String(value || '').toLowerCase().replace(/\s/g, '')

export function isNavigationRequest(value) {
  return /(?:前往|抵达|到|去|怎么走|怎么去|如何去|导航|路线)/.test(String(value || ''))
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

export function findLocationMatches(text, campus) {
  const normalizedText = normalize(text)
  const matches = (campus.locations || []).flatMap((location) => {
    const aliases = [location.name, ...(location.aliases || []), ...(campusAliases[campus.id]?.[location.id] || [])]
    const found = aliases.map(normalize).filter(Boolean).map((alias) => ({
      index: normalizedText.lastIndexOf(alias),
      aliasLength: alias.length,
    })).filter((match) => match.index >= 0)
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
      .find(({ location }) => location.id !== destination?.id)?.location
    if (explicitOrigin) return explicitOrigin
  }
  const matches = findLocationMatches(text, campus)
  const origin = matches.find(({ location }) => location.id !== destination?.id)?.location || null
  return matches.length > 1 ? origin : null
}

export function refersToCurrentPosition(value) {
  return /(我的位置|当前位置|从我这里|从我这儿|从我当前位置)/.test(value)
}

export function requestsLandmarkHistory(value) {
  return /(历史|校史|故事|来历|介绍|讲解|建造|建筑|人物|纪念|为什么|意义|背景|何时|谁|是什么|什么)/.test(value)
}

export function isNavigationPoint(point) {
  return Array.isArray(point) && point.length === 2
    && point.every(Number.isFinite)
    && Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180
}

export function buildAgentInstructions({ campus, narrative, navigationIntent, liveOrigin, mode, destination }) {
  const instructions = [`【当前校区已确定】用户正在查看${campus.name}地图，未明确提出跨校区时，所有地点均默认属于${campus.name}；不要再次询问用户所在校区。`]
  if (navigationIntent) {
    instructions.push(`【网页导航协同】出行方式：${travelModeLabels[mode]}。${destination ? `用户已确认目的地：${destination.name}。` : ''}请说明建议的起点和终点；不要自行估算距离、时长或给出分步路线，由网站依据已确认地点生成路线图。`)
    if (liveOrigin) instructions.push(`【本次导航起点】当前位置（GCJ-02）：经度 ${liveOrigin[1].toFixed(6)}，纬度 ${liveOrigin[0].toFixed(6)}。`)
  }
  if (narrative) {
    instructions.push(`【校史检索资料】命中地点：${narrative.title}。简介：${narrative.brief}。事实资料：${narrative.facts}\n【答复要求】仅依据上述资料，用自然、克制的校园讲解口吻回答用户问题；不要新增具体年份、尺寸、人物经历、建筑功能、开放安排或无法核验的细节。不要规划路线，也不要询问校区。末尾另起一行标注“【资料依据】本站整理的校史材料”。当前并未检索南开大学官网，不得声称信息来自官网。`)
  }
  return instructions.join('\n')
}

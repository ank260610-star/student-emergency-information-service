<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { findLandmarkNarrative } from '../data/landmarkNarratives'
import {
  askNkZhixingAgent,
  extractNavigationDestination,
  getRoute,
  isNavigationRequest,
  resolveCampusPlace,
} from '../services/nkZhixingAgent'
import { wgs84ToGcj02 } from '../utils/mapUtils'

const props = defineProps({
  campus: { type: Object, required: true },
  selectedLocation: { type: Object, default: null },
  initialMessage: { type: String, default: '' },
  autoSubmit: { type: Boolean, default: false },
  liveNavigation: { type: Boolean, default: false },
  livePosition: { type: Object, default: null },
})

const emit = defineEmits(['focus-location', 'show-route', 'route-status', 'show-candidates', 'clear-candidates'])

const message = ref('')
const loading = ref(false)
const error = ref('')
const result = ref(null)
const travelMode = ref('walking')
const selectedDestinationId = ref('')
const landmarkNarrationMode = ref(false)
const landmarkNarrationMessage = ref('')

const travelModeLabels = {
  walking: '步行',
  bicycling: '骑行',
  driving: '驾车',
}

const campusAliases = {
  jinnan: {
    'jinnan-public-teaching': ['公教'],
  },
}

function findLocationMatches(text) {
  const locations = props.campus.locations || []
  const normalizedText = text.toLocaleLowerCase('zh-CN').replaceAll(/\s/g, '')
  return locations.flatMap((location) => {
    const aliases = [
      location.name,
      ...(location.aliases || []),
      ...(campusAliases[props.campus.id]?.[location.id] || []),
    ]
    const matches = aliases.map((alias) => ({
      index: normalizedText.lastIndexOf(alias.toLocaleLowerCase('zh-CN')),
      aliasLength: alias.length,
    })).filter((match) => match.index >= 0)
    const match = matches.sort((left, right) => right.aliasLength - left.aliasLength || right.index - left.index)[0]
    return match ? [{ location, ...match }] : []
  }).sort((left, right) => left.index - right.index)
}

function findDestination(text) {
  return findLocationMatches(text).at(-1)?.location || null
}

function findDestinationCandidates(text) {
  const destinationText = text.split(/(?:前往|抵达|到|去)/).at(-1)?.replace(/[，。！？、,.!？]/g, '') || text
  const directMatches = findLocationMatches(destinationText)
  const longestMatch = Math.max(...directMatches.map((match) => match.aliasLength || 0), 0)
  const directLocations = directMatches
    .filter((match) => (match.aliasLength || 0) === longestMatch)
    .map(({ location }) => location)
  if (directLocations.length) return [...new Map(directLocations.map((location) => [location.id, location])).values()]

  const genericTerms = ['图书馆', '食堂', '宿舍', '体育馆', '教学楼', '校门', '大门', '医院', '广场']
  const term = genericTerms.find((item) => destinationText.includes(item))
  if (!term) return []
  return (props.campus.locations || []).filter((location) => location.name.includes(term))
}

function findOrigin(text, destination) {
  const matches = findLocationMatches(text)
  const origin = matches.find(({ location }) => location.id !== destination?.id)?.location || null
  return matches.length > 1 ? origin : null
}

const suggestions = computed(() => [
  `从${props.campus.short}西南门去中心图书馆怎么走？`,
  `我在${props.campus.short}，想去校医院。`,
  '晚上一个人在学校里迷路了，该怎么办？',
])

const selectedLandmarkNarrative = computed(() => props.selectedLocation?.landmarkNarrative || null)

function useSuggestion(value) {
  message.value = value
}

function chooseCandidate(locationId) {
  selectedDestinationId.value = locationId
  emit('clear-candidates')
  submit()
}

function requestLandmarkNarration() {
  const narrative = selectedLandmarkNarrative.value
  if (!narrative || loading.value) return
  const prompt = `请介绍一下${narrative.title}，用适合校园参观的讲解口吻。`
  landmarkNarrationMode.value = true
  landmarkNarrationMessage.value = prompt
  message.value = prompt
  submit()
}

watch(message, (value) => {
  selectedDestinationId.value = ''
  if (value !== landmarkNarrationMessage.value) landmarkNarrationMode.value = false
})

function refersToCurrentPosition(value) {
  return /(我的位置|当前位置|从我这里|从我这儿|从我当前位置)/.test(value)
}

function requestsLandmarkHistory(value) {
  return /(历史|校史|故事|来历|介绍|讲解|建造|建筑|人物|纪念|为什么|意义|背景|何时|谁|是什么|什么)/.test(value)
}

async function showRoute(origin, destination, originName) {
  const route = await getRoute({
    origin: `${origin[1]},${origin[0]}`,
    destination: `${destination.navigationPoint[1]},${destination.navigationPoint[0]}`,
    mode: travelMode.value,
  })
  emit('show-route', { ...route, destination, mode: travelMode.value })
  emit('route-status', `已显示：${originName} → ${destination.name} 的${travelModeLabels[travelMode.value]}轨迹（${destination.routeSource || '自建 MVP 坐标'}）。`)
}

async function resolveNavigationPoint(location) {
  if (!location) return null
  if (location.navigationPoint) return location.navigationPoint
  return resolveCampusPlace({ campus: props.campus.id, name: location.name, locationId: location.id })
}

async function submit() {
  const prompt = message.value.trim()
  if (!prompt || loading.value) return

  const selectedNarrative = selectedLandmarkNarrative.value
  const retrievedNarrative = requestsLandmarkHistory(prompt) ? findLandmarkNarrative(prompt) : null
  const narrative = landmarkNarrationMode.value ? selectedNarrative : retrievedNarrative
  const isLandmarkNarration = Boolean(narrative)

  const needsCurrentPosition = refersToCurrentPosition(prompt)
  const liveOrigin = props.livePosition
    ? wgs84ToGcj02([Number(props.livePosition.latitude), Number(props.livePosition.longitude)])
    : null
  if (needsCurrentPosition && !liveOrigin) {
    error.value = '请先在地图控制区点击“使用当前位置”，授权定位后再开始规划。'
    return
  }

  const destinationCandidates = isLandmarkNarration ? [] : findDestinationCandidates(prompt)
  const selectedDestination = props.campus.locations?.find((location) => location.id === selectedDestinationId.value) || null
  if (!selectedDestination && destinationCandidates.length) {
    emit('show-candidates', destinationCandidates)
    error.value = destinationCandidates.length > 1
      ? '发现多个可能的目的地，已在地图上高亮，请点击对应地点后继续。'
      : '已在地图上高亮目的地，请点击该地点确认后继续。'
    return
  }

  const navigationIntent = !isLandmarkNarration && (
    Boolean(selectedDestination || destinationCandidates[0] || needsCurrentPosition)
    || isNavigationRequest(prompt)
  )
  const navigationProtocol = navigationIntent
    ? '\n【网页导航协同】请先确认建议的起点、终点和出行方式；不要自行估算距离、时长或给出分步路线。确认后由网站依据该建议生成唯一的路线图。'
    : ''
  const campusProtocol = `\n【当前校区已确定】用户正在查看${props.campus.name}地图，未明确提出跨校区时，所有地点均默认属于${props.campus.name}；不要再次询问用户所在校区。`
  const landmarkNarrationProtocol = isLandmarkNarration
    ? `\n【校史检索资料】命中地点：${narrative.title}。简介：${narrative.brief}。事实资料：${narrative.facts}\n【答复要求】仅依据上述资料，用自然、克制的校园讲解口吻回答用户问题；不要新增具体年份、尺寸、人物经历、建筑功能、开放安排或无法核验的细节。不要规划路线，也不要询问校区。末尾另起一行标注“【资料依据】本站整理的校史材料”。当前并未检索南开大学官网，不得声称信息来自官网。`
    : ''
  const agentMessage = needsCurrentPosition && liveOrigin
    ? `${prompt}\n【本次导航起点】当前位置（GCJ-02）：经度 ${liveOrigin[1].toFixed(6)}，纬度 ${liveOrigin[0].toFixed(6)}。出行方式：${travelModeLabels[travelMode.value]}。${campusProtocol}${navigationProtocol}${landmarkNarrationProtocol}`
    : `${prompt}${campusProtocol}${navigationProtocol}${landmarkNarrationProtocol}`
  loading.value = true
  error.value = ''
  result.value = null
  try {
    result.value = await askNkZhixingAgent({
      message: agentMessage,
      campus: props.campus.id,
      selectedLocation: props.selectedLocation,
    })
    if (isLandmarkNarration) return
    if (result.value.locationId) emit('focus-location', result.value.locationId)
    const recommendedDestination = result.value.locationId
      ? props.campus.locations?.find((location) => location.id === result.value.locationId)
      : findDestination(result.value.answer || '')
    let destination = recommendedDestination || selectedDestination || destinationCandidates[0] || findDestination(prompt)
    if (!destination && navigationIntent) {
      const externalName = extractNavigationDestination(prompt)
      if (externalName) {
        try {
          const navigationPoint = await resolveCampusPlace({ campus: props.campus.id, name: externalName })
          destination = {
            id: `amap-${externalName}`,
            name: externalName,
            navigationPoint,
            routeSource: '高德地图地点兜底',
          }
        } catch (placeError) {
          error.value = `自建地点库未收录“${externalName}”，且${placeError.message}`
        }
      }
    }
    const originLocation = !liveOrigin && !props.selectedLocation?.navigationPoint
      ? findOrigin(prompt, destination)
      : null
    const [destinationPoint, resolvedOrigin] = await Promise.all([
      resolveNavigationPoint(destination).catch(() => null),
      resolveNavigationPoint(originLocation).catch(() => null),
    ])
    const origin = liveOrigin || props.selectedLocation?.navigationPoint || resolvedOrigin
    const originName = liveOrigin
      ? '当前位置'
      : props.selectedLocation?.name || originLocation?.name

    if (origin && destinationPoint) {
      await showRoute(origin, {
        ...destination,
        navigationPoint: destinationPoint,
        routeSource: destination.routeSource || (destination.navigationPoint ? '自建 MVP 坐标' : '高德地图地点兜底'),
      }, originName || '起点')
    } else if (props.liveNavigation && destinationPoint) {
      error.value = '正在获取当前位置，请稍候再次开始规划。'
    } else if (!destination) {
      error.value = error.value || 'NK 智行未识别出可绘制的目的地，请补充具体地点名称。'
    } else if (!origin) {
      error.value = '请补充起点，或在地图控制区点击“使用当前位置”。'
    } else {
      error.value = 'NK 智行已给出建议，但暂未获取到该地点的可用坐标。'
    }
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    if (isLandmarkNarration) {
      landmarkNarrationMode.value = false
      landmarkNarrationMessage.value = ''
    }
    loading.value = false
  }
}

onMounted(() => {
  const initialMessage = props.initialMessage.trim().slice(0, 500)
  if (!initialMessage) return
  message.value = initialMessage
  if (props.autoSubmit) submit()
})

defineExpose({ chooseCandidate })
</script>

<template>
  <section class="nk-agent-panel" aria-labelledby="nk-agent-title">
    <div class="nk-agent-heading">
      <div>
        <span class="section-kicker"><i></i> NK-GENIOS AGENT</span>
        <h2 id="nk-agent-title">问问 NK 智行</h2>
        <p>说出目的地、出发位置或你的困难；点选地标或直接询问其校史，也可获得对应讲解。</p>
      </div>
      <span class="nk-agent-badge">试运行</span>
    </div>

    <div class="nk-agent-context" aria-live="polite">
      <span>当前校区</span><strong>{{ campus.name }}</strong>
      <template v-if="selectedLocation">
        <span>已选地点</span><strong>{{ selectedLocation.name }}</strong>
        <button
          v-if="selectedLandmarkNarrative"
          type="button"
          class="nk-agent-narrate"
          :disabled="loading"
          @click="requestLandmarkNarration"
        >
          {{ loading && landmarkNarrationMode ? '正在生成讲解…' : '讲解这个地标' }}
        </button>
      </template>
    </div>

    <div class="nk-agent-suggestions" aria-label="示例问题">
      <button v-for="suggestion in suggestions" :key="suggestion" type="button" @click="useSuggestion(suggestion)">
        {{ suggestion }}
      </button>
    </div>

    <form class="nk-agent-form" @submit.prevent="submit">
      <label for="nk-agent-input">向 NK 智行描述你的需求</label>
      <textarea
        id="nk-agent-input"
        v-model="message"
        maxlength="500"
        placeholder="例如：我在西南门，带着行李去中心图书馆，想少走一点。"
      ></textarea>
      <label class="nk-agent-mode" for="nk-agent-mode">
        <span>出行方式</span>
        <select id="nk-agent-mode" v-model="travelMode">
          <option value="walking">步行</option>
          <option value="bicycling">骑行</option>
          <option value="driving">驾车</option>
        </select>
      </label>
      <div>
        <small>可直接问“思源堂的历史是什么？”；请勿输入身份证号、手机号、病历等敏感信息。</small>
        <button type="submit" :disabled="!message.trim() || loading">{{ loading ? '正在分析…' : '开始规划 →' }}</button>
      </div>
    </form>

    <p v-if="error" class="nk-agent-error" role="alert">{{ error }}</p>

    <article v-if="result" class="nk-agent-result" aria-live="polite">
      <span>NK 智行建议</span>
      <p>{{ result.answer }}</p>
      <ol v-if="result.steps?.length">
        <li v-for="step in result.steps" :key="step">{{ step }}</li>
      </ol>
      <p v-if="result.warning" class="nk-agent-warning">{{ result.warning }}</p>
      <a v-if="result.mapUrl" :href="result.mapUrl" target="_blank" rel="noopener">在地图中继续查看 →</a>
    </article>
  </section>
</template>

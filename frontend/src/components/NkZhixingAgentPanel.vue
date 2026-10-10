<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { findLandmarkNarrative } from '../data/landmarkNarratives'
import { askNkZhixingAgent, getRoute, NK_ZHIXING_MESSAGE_LIMIT, resolveCampusPlace } from '../services/nkZhixingAgent'
import {
  buildAgentInstructions,
  extractNavigationDestination,
  findDestination,
  findDestinationCandidates,
  findOrigin,
  isNavigationPoint,
  isPointNearCampus,
  isNavigationRequest,
  refersToCurrentPosition,
  requestsLandmarkHistory,
  travelModeLabels,
} from '../services/nkZhixingNavigation'
import { wgs84ToGcj02 } from '../utils/mapUtils'
import { isAbortError } from '../utils/request'

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
const composing = ref(false)
const error = ref('')
const result = ref(null)
const travelMode = ref('walking')
const selectedDestinationId = ref('')
const landmarkNarrationMode = ref(false)
let pendingCandidates = null
let requestVersion = 0
let requestController = null

const suggestions = computed(() => [
  `从${props.campus.short}西南门去中心图书馆怎么走？`,
  `我在${props.campus.short}，想去校医院。`,
  '晚上一个人在学校里迷路了，该怎么办？',
])
const selectedLandmarkNarrative = computed(() => props.selectedLocation?.landmarkNarrative || null)

function cancelRequest() {
  requestVersion += 1
  requestController?.abort()
  requestController = null
  loading.value = false
}

function clearCandidates() {
  pendingCandidates = null
  selectedDestinationId.value = ''
  emit('clear-candidates')
}

function resetQuestion() {
  cancelRequest()
  clearCandidates()
  error.value = ''
  result.value = null
  landmarkNarrationMode.value = false
}

// Synchronous invalidation prevents an already-resolving request from writing
// results for a previous campus, question, or travel mode in the same tick.
watch([message, travelMode, () => props.campus.id], resetQuestion, { flush: 'sync' })
onBeforeUnmount(cancelRequest)

function useSuggestion(value) {
  message.value = value
}

function chooseCandidate(locationId) {
  if (loading.value || composing.value || !pendingCandidates
    || pendingCandidates.campusId !== props.campus.id
    || pendingCandidates.prompt !== message.value.trim()
    || !pendingCandidates.ids.includes(locationId)) return
  selectedDestinationId.value = locationId
  pendingCandidates = null
  emit('clear-candidates')
  submit()
}

function requestLandmarkNarration() {
  const narrative = selectedLandmarkNarrative.value
  if (!narrative || loading.value) return
  message.value = `请介绍一下${narrative.title}，用适合校园参观的讲解口吻。`
  landmarkNarrationMode.value = true
  submit()
}

async function resolveNavigationPoint(location, campus, signal) {
  if (!location) return null
  if (location.campus && location.campus !== campus.id) {
    throw new Error(`“${location.name}”不属于当前${campus.name}。`)
  }
  const navigationPoint = isNavigationPoint(location.navigationPoint)
    ? location.navigationPoint
    : await resolveCampusPlace({ campus: campus.id, name: location.name, locationId: location.id }, { signal })
  if (!isPointNearCampus(navigationPoint, campus.geoCenter)) {
    throw new Error(`“${location.name}”的坐标不在当前${campus.name}附近，已停止绘制以避免跨校区路线。`)
  }
  return navigationPoint
}

async function submit() {
  const prompt = message.value.trim().slice(0, NK_ZHIXING_MESSAGE_LIMIT)
  if (!prompt || loading.value || composing.value) return

  // Keep one immutable selection context for every request in this chain.
  const campus = props.campus
  const mode = travelMode.value
  const selectedLocation = props.selectedLocation
  const narrative = landmarkNarrationMode.value
    ? selectedLandmarkNarrative.value
    : (requestsLandmarkHistory(prompt) ? findLandmarkNarrative(prompt) : null)
  const needsCurrentPosition = refersToCurrentPosition(prompt)
  const position = props.livePosition
    ? [Number(props.livePosition.latitude), Number(props.livePosition.longitude)] : null
  const liveOrigin = isNavigationPoint(position) ? wgs84ToGcj02(position) : null
  const campusLiveOrigin = isPointNearCampus(liveOrigin, campus.geoCenter) ? liveOrigin : null
  if (!narrative && needsCurrentPosition && !campusLiveOrigin) {
    error.value = liveOrigin
      ? `当前位置不在当前${campus.name}附近，请切换到所在校区或明确输入校内起点。`
      : '请先在地图控制区点击“使用当前位置”，授权定位后再开始规划。'
    return
  }

  const destinationCandidates = narrative ? [] : findDestinationCandidates(prompt, campus)
  const selectedDestination = campus.locations?.find((location) => location.id === selectedDestinationId.value) || null
  const navigationIntent = !narrative && (
    isNavigationRequest(prompt) || needsCurrentPosition || Boolean(selectedDestination)
    || destinationCandidates.some((location) => [location.name, ...(location.aliases || [])].includes(prompt))
  )
  if (navigationIntent && !selectedDestination && destinationCandidates.length) {
    pendingCandidates = { campusId: campus.id, prompt, ids: destinationCandidates.map((location) => location.id) }
    emit('show-candidates', destinationCandidates)
    error.value = destinationCandidates.length > 1
      ? '发现多个可能的目的地，已在地图上高亮，请点击对应地点后继续。'
      : '已在地图上高亮目的地，请点击该地点确认后继续。'
    return
  }

  const explicitOrigin = needsCurrentPosition ? null : findOrigin(prompt, selectedDestination || destinationCandidates[0], campus)
  const instructions = buildAgentInstructions({
    campus, narrative, navigationIntent, mode, destination: selectedDestination,
    prompt,
    liveOrigin: !explicitOrigin ? campusLiveOrigin : null,
  })
  const version = ++requestVersion
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  requestController = controller
  const signal = controller?.signal
  const isCurrent = () => version === requestVersion && !signal?.aborted
  loading.value = true
  error.value = ''
  result.value = null

  try {
    const answer = await askNkZhixingAgent({
      message: `${prompt}\n${instructions}`,
      campus: campus.id,
      selectedLocation: selectedDestination || selectedLocation,
    }, { signal })
    if (!isCurrent()) return
    result.value = answer
    if (narrative) return
    if (!navigationIntent) {
      if (answer.locationId) emit('focus-location', answer.locationId)
      return
    }

    const recommendedDestination = campus.locations?.find((location) => location.id === answer.locationId)
      || findDestination(answer.answer, campus)
    // A suggestion from the model must never override a location the user confirmed.
    const externalName = extractNavigationDestination(prompt)
    let destination = selectedDestination || destinationCandidates[0] || (!externalName ? recommendedDestination : null)
    if (!destination) {
      if (externalName) {
        try {
          const navigationPoint = await resolveCampusPlace({ campus: campus.id, name: externalName }, { signal })
          if (!isCurrent()) return
          destination = { id: `amap-${externalName}`, name: externalName, navigationPoint, routeSource: '高德地图地点兜底' }
        } catch (placeError) {
          if (!isCurrent() || isAbortError(placeError)) return
          error.value = `自建地点库未收录“${externalName}”，且${placeError.message}`
        }
      }
    }
    if (!isCurrent()) return
    if (!destination) {
      error.value = error.value || 'NK 智行未识别出可绘制的目的地，请补充具体地点名称。'
      return
    }
    if (campus.locations?.some((location) => location.id === destination.id)) emit('focus-location', destination.id)

    const originLocation = needsCurrentPosition ? null : findOrigin(prompt, destination, campus)
    const [destinationPoint, resolvedOrigin] = await Promise.all([
      resolveNavigationPoint(destination, campus, signal),
      resolveNavigationPoint(originLocation, campus, signal),
    ])
    if (!isCurrent()) return
    const origin = resolvedOrigin || (!originLocation ? campusLiveOrigin : null)
    if (!origin) {
      error.value = '请补充起点，或在地图控制区点击“使用当前位置”后再开始规划。'
      return
    }

    const route = await getRoute({
      origin: `${origin[1]},${origin[0]}`,
      destination: `${destinationPoint[1]},${destinationPoint[0]}`,
      mode,
    }, { signal })
    if (!isCurrent()) return
    const routeSource = destination.routeSource || (isNavigationPoint(destination.navigationPoint) ? destination.geoSource || '本站收录坐标' : '高德地图地点兜底')
    emit('show-route', { ...route, destination: { ...destination, navigationPoint: destinationPoint, routeSource }, mode })
    emit('route-status', `已显示：${originLocation?.name || '当前位置'} → ${destination.name} 的${travelModeLabels[mode]}轨迹（高德地图路线；目的地：${routeSource}）。`)
  } catch (requestError) {
    if (isCurrent() && !isAbortError(requestError)) error.value = requestError.message || '请求失败，请稍后再试。'
  } finally {
    if (isCurrent()) {
      landmarkNarrationMode.value = false
      loading.value = false
      requestController = null
      controller?.abort()
    }
  }
}

onMounted(() => {
  const initialMessage = props.initialMessage.trim().slice(0, NK_ZHIXING_MESSAGE_LIMIT)
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

    <form class="nk-agent-form" :aria-busy="loading" @submit.prevent="submit">
      <label for="nk-agent-input">向 NK 智行描述你的需求</label>
      <textarea
        id="nk-agent-input"
        v-model="message"
        :maxlength="NK_ZHIXING_MESSAGE_LIMIT"
        @compositionstart="composing = true"
        @compositionend="composing = false"
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
        <button type="submit" :disabled="!message.trim() || loading || composing">{{ loading ? '正在分析…' : '开始规划 →' }}</button>
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
      <a v-if="result.mapUrl" :href="result.mapUrl" target="_blank" rel="noopener noreferrer">在地图中继续查看 →</a>
    </article>
  </section>
</template>

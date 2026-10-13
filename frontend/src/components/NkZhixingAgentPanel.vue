<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { findLandmarkNarrative } from '../data/landmarkNarratives'
import { findPlaceProfile } from '../data/placeProfiles'
import { askNkZhixingAgentWithNavigationFallback, getRoute, NK_ZHIXING_MESSAGE_LIMIT, resolveCampusPlace } from '../services/nkZhixingAgent'
import {
  buildAgentInstructions,
  extractNavigationDestination,
  extractNavigationOrigin,
  findRequestedTravelMode,
  findDestination,
  findDestinationCandidates,
  findOrigin,
  isNavigationPoint,
  isNamedFacilityGate,
  isPointNearCampus,
  isNavigationRequest,
  refersToCurrentPosition,
  requestsLandmarkHistory,
  travelModeLabels,
} from '../services/nkZhixingNavigation'
import { routeInstructionsFromGeometry, wgs84ToGcj02 } from '../utils/mapUtils'
import { isAbortError } from '../utils/request'
import {
  createSpeechRecognition,
  speakNkZhixingResult,
  stopNkZhixingSpeech,
  supportsSpeechRecognition,
  supportsSpeechSynthesis,
} from '../services/nkZhixingSpeech'

const props = defineProps({
  campus: { type: Object, required: true },
  selectedLocation: { type: Object, default: null },
  initialMessage: { type: String, default: '' },
  autoSubmit: { type: Boolean, default: false },
  liveNavigation: { type: Boolean, default: false },
  livePosition: { type: Object, default: null },
})

const emit = defineEmits(['focus-location', 'show-route', 'route-status', 'show-candidates', 'clear-candidates', 'voice-output-change'])
const message = ref('')
const loading = ref(false)
const composing = ref(false)
const error = ref('')
const result = ref(null)
const travelMode = ref('walking')
const selectedDestinationId = ref('')
const landmarkNarrationMode = ref(false)
const listening = ref(false)
const voiceInputSupported = ref(false)
const voiceOutputSupported = ref(false)
const voiceOutputEnabled = ref(false)
const voiceStatus = ref('')
let pendingCandidates = null
let requestVersion = 0
let requestController = null
let speechRecognition = null

const exampleGate = computed(() => props.campus.id === 'balitai' ? '东门' : '西南门')
const suggestions = computed(() => [
  `从${props.campus.short}${exampleGate.value}去中心图书馆怎么走？`,
  `我在${props.campus.short}，想去校医院。`,
  '晚上一个人在学校里迷路了，该怎么办？',
])
const selectedLandmarkNarrative = computed(() => (
  props.selectedLocation?.placeProfile || props.selectedLocation?.landmarkNarrative || null
))

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

function speechErrorMessage(code) {
  if (code === 'not-allowed' || code === 'service-not-allowed') return '没有获得麦克风权限，请在浏览器设置中允许本网站使用麦克风。'
  if (code === 'no-speech') return '没有听清，请靠近麦克风后再说一次。'
  if (code === 'audio-capture') return '没有检测到可用麦克风。'
  if (code === 'network') return '语音识别服务暂时不可用，请改用文字输入。'
  return '语音识别未完成，请再试一次或改用文字输入。'
}

function toggleVoiceInput() {
  if (!voiceInputSupported.value || loading.value) return
  voiceStatus.value = ''
  if (listening.value) {
    speechRecognition?.stop()
    return
  }

  speechRecognition?.abort()
  speechRecognition = createSpeechRecognition({
    onStart: () => {
      listening.value = true
      voiceStatus.value = '正在聆听，请说出目的地或导航需求…'
    },
    onResult: (transcript, isFinal) => {
      message.value = transcript.slice(0, NK_ZHIXING_MESSAGE_LIMIT)
      voiceStatus.value = isFinal ? '已识别，请检查文字后点击“开始规划”。' : `正在识别：${transcript}`
    },
    onError: (code) => {
      listening.value = false
      voiceStatus.value = speechErrorMessage(code)
    },
    onEnd: () => {
      listening.value = false
      if (!message.value.trim() && !voiceStatus.value.includes('权限')) voiceStatus.value = '语音输入已结束，请重试或改用文字输入。'
    },
  })
  try {
    speechRecognition?.start()
  } catch {
    listening.value = false
    voiceStatus.value = '麦克风正在占用，请稍后再试。'
  }
}

function toggleVoiceOutput() {
  if (!voiceOutputSupported.value) return
  voiceOutputEnabled.value = !voiceOutputEnabled.value
  emit('voice-output-change', voiceOutputEnabled.value)
  if (!voiceOutputEnabled.value) {
    stopNkZhixingSpeech()
    voiceStatus.value = '语音播报已关闭。'
    return
  }
  voiceStatus.value = '语音播报已开启。'
  if (result.value) speakNkZhixingResult(result.value)
}

function speakResult(value) {
  if (value && voiceOutputEnabled.value) speakNkZhixingResult(value)
}

function formatRouteDistance(value) {
  const meters = Number(value)
  if (!Number.isFinite(meters) || meters < 0) return ''
  if (meters < 1000) return `${Math.round(meters)} 米`
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} 公里`
}

function formatRouteDuration(value) {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds < 0) return ''
  const minutes = Math.max(1, Math.ceil(seconds / 60))
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes ? `${hours} 小时 ${remainingMinutes} 分钟` : `${hours} 小时`
}

function routeSummary(route, originName, destinationName, mode) {
  const distance = formatRouteDistance(route.distanceMeters)
  const duration = formatRouteDuration(route.durationSeconds)
  const estimate = `${distance ? `，全程约 ${distance}` : ''}${duration ? `，预计 ${duration}` : ''}`
  return `已生成从${originName}到${destinationName}的${travelModeLabels[mode]}路线${estimate}。`
}

// Synchronous invalidation prevents an already-resolving request from writing
// results for a previous campus, question, or travel mode in the same tick.
watch(message, (value) => {
  const requestedMode = findRequestedTravelMode(value)
  if (requestedMode && requestedMode !== travelMode.value) travelMode.value = requestedMode
}, { flush: 'sync' })
watch([message, travelMode, () => props.campus.id], resetQuestion, { flush: 'sync' })
onBeforeUnmount(() => {
  cancelRequest()
  speechRecognition?.abort()
  stopNkZhixingSpeech()
})

function useSuggestion(value) {
  message.value = value
}

function setQuestion(value) {
  if (loading.value) return
  resetQuestion()
  message.value = String(value || '').trim().slice(0, NK_ZHIXING_MESSAGE_LIMIT)
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
    : (requestsLandmarkHistory(prompt) ? (findPlaceProfile(prompt) || findLandmarkNarrative(prompt)) : null)
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
  const selectedDestination = campus.locations?.find((location) => location.id === selectedDestinationId.value)
    || (destinationCandidates.length === 1 ? destinationCandidates[0] : null)
  const navigationIntent = !narrative && (
    isNavigationRequest(prompt) || needsCurrentPosition || Boolean(selectedDestination)
    || destinationCandidates.some((location) => [location.name, ...(location.aliases || [])].includes(prompt))
  )
  if (navigationIntent && !selectedDestination && destinationCandidates.length > 1) {
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
    const navigationFallbackDestination = navigationIntent
      ? (selectedDestination || destinationCandidates[0]) : null
    const answer = await askNkZhixingAgentWithNavigationFallback({
      message: `${prompt}\n${instructions}`,
      campus: campus.id,
      selectedLocation: selectedDestination || selectedLocation,
    }, {
      signal,
      destinationName: navigationFallbackDestination?.name,
      modeLabel: travelModeLabels[mode],
    })
    if (!isCurrent()) return
    result.value = answer
    if (narrative) {
      speakResult(answer)
      return
    }
    if (!navigationIntent) {
      if (answer.locationId) emit('focus-location', answer.locationId)
      speakResult(answer)
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
    const externalOriginName = !needsCurrentPosition && !originLocation
      ? extractNavigationOrigin(prompt) : ''
    const externalOrigin = campus.id === 'balitai' && isNamedFacilityGate(externalOriginName)
      ? { id: `amap-${externalOriginName}`, name: externalOriginName }
      : null
    const [destinationPoint, resolvedOrigin] = await Promise.all([
      resolveNavigationPoint(destination, campus, signal),
      externalOrigin
        ? resolveCampusPlace({ campus: campus.id, name: externalOrigin.name }, { signal })
        : resolveNavigationPoint(originLocation, campus, signal),
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
      campus: campus.id,
      mode,
    }, { signal })
    if (!isCurrent()) return
    const routeSource = destination.routeSource || (isNavigationPoint(destination.navigationPoint) ? destination.geoSource || '本站收录坐标' : '高德地图地点兜底')
    const originName = originLocation?.name || externalOrigin?.name || '当前位置'
    const routeSteps = route.instructions.length
      ? route.instructions
      : routeInstructionsFromGeometry(route.routePoints)
    result.value = {
      ...answer,
      routeSummary: routeSummary(route, originName, destination.name, mode),
      steps: routeSteps,
    }
    emit('show-route', { ...route, destination: { ...destination, navigationPoint: destinationPoint, routeSource }, mode })
    emit('route-status', `已显示：${originName} → ${destination.name} 的${travelModeLabels[mode]}路线（高德地图路线；目的地：${routeSource}）。`)
    speakResult(result.value)
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
  voiceInputSupported.value = supportsSpeechRecognition()
  voiceOutputSupported.value = supportsSpeechSynthesis()
  const initialMessage = props.initialMessage.trim().slice(0, NK_ZHIXING_MESSAGE_LIMIT)
  if (!initialMessage) return
  message.value = initialMessage
  if (props.autoSubmit) submit()
})

defineExpose({ chooseCandidate, setQuestion })
</script>

<template>
  <section class="nk-agent-panel" aria-labelledby="nk-agent-title">
    <div class="nk-agent-heading">
      <div>
        <span class="section-kicker"><i></i> NK-GENIOS AGENT</span>
        <h2 id="nk-agent-title">问问 NK 智行</h2>
        <p>说出目的地、出发位置或你的困难；也可点选学院、建筑或校史地标获取介绍。</p>
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
          {{ loading && landmarkNarrationMode ? '正在生成介绍…' : '介绍这个地点' }}
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
      <div class="nk-agent-voice-tools" aria-label="语音助手控制">
        <button
          type="button"
          class="nk-agent-voice-button"
          :class="{ 'is-listening': listening }"
          :disabled="!voiceInputSupported || loading"
          :aria-pressed="listening"
          @click="toggleVoiceInput"
        >
          <span aria-hidden="true">{{ listening ? '■' : '●' }}</span>
          {{ listening ? '停止识别' : '语音输入' }}
        </button>
        <button
          type="button"
          class="nk-agent-voice-button"
          :class="{ 'is-active': voiceOutputEnabled }"
          :disabled="!voiceOutputSupported"
          :aria-pressed="voiceOutputEnabled"
          @click="toggleVoiceOutput"
        >
          <span aria-hidden="true">◖</span>
          {{ voiceOutputEnabled ? '关闭播报' : '开启播报' }}
        </button>
        <small v-if="!voiceInputSupported">当前浏览器不支持语音识别，可继续使用文字输入。</small>
      </div>
      <p v-if="voiceStatus" class="nk-agent-voice-status" :class="{ 'is-listening': listening }" aria-live="polite">
        {{ voiceStatus }}
      </p>
      <label class="nk-agent-mode" for="nk-agent-mode">
        <span>出行方式</span>
        <select id="nk-agent-mode" v-model="travelMode">
          <option value="walking">步行</option>
          <option value="bicycling">骑行</option>
          <option value="driving">驾车</option>
        </select>
      </label>
      <div>
        <small>可直接问“金融学院是做什么的？”或“思源堂的历史是什么？”；请勿输入身份证号、手机号、病历等敏感信息。</small>
        <button type="submit" :disabled="!message.trim() || loading || composing">{{ loading ? '正在分析…' : '开始规划 →' }}</button>
      </div>
    </form>

    <p v-if="error" class="nk-agent-error" role="alert">{{ error }}</p>

    <article v-if="result" class="nk-agent-result" aria-live="polite">
      <span>NK 智行建议</span>
      <p v-if="result.routeSummary" class="nk-agent-route-summary">{{ result.routeSummary }}</p>
      <p v-else>{{ result.answer }}</p>
      <ol v-if="result.steps?.length">
        <li v-for="(step, index) in result.steps" :key="`${index}-${step}`">{{ step }}</li>
      </ol>
      <p v-if="result.warning" class="nk-agent-warning">{{ result.warning }}</p>
      <a v-if="result.mapUrl" :href="result.mapUrl" target="_blank" rel="noopener noreferrer">在地图中继续查看 →</a>
    </article>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import CampusInteractiveMap from '../components/CampusInteractiveMap.vue'
import CampusMapControls from '../components/CampusMapControls.vue'
import NkZhixingAgentPanel from '../components/NkZhixingAgentPanel.vue'
import { consumeNkZhixingHandoff, getRoute, resolveCampusPlace } from '../services/nkZhixingAgent'
import { createNavigationSpeechTracker, speakNkZhixingResult } from '../services/nkZhixingSpeech'
import {
  orderStopsFromNearestEndpoint,
  routeInstructionsFromGeometry,
  routePointDistance,
  wgs84ToGcj02,
} from '../utils/mapUtils'
import { usePhotoDialog } from '../composables/usePhotoDialog'
import {
  campusTours,
  campusConfigs,
  categoryMeta,
  getCampusLocations,
} from '../data/campusLocations'

const route = useRoute()
const agentHandoff = consumeNkZhixingHandoff()
const routeCampus = ['balitai', 'jinnan'].includes(route.query.campus) ? route.query.campus : null
const campus = ref(agentHandoff?.campus || routeCampus || 'balitai')
const baseMode = ref('illustration')
const category = ref('all')
const query = ref('')
const selectedId = ref('')
const candidateLocationIds = ref([])
const mapStatus = ref(`${campusConfigs[campus.value].name} · ${getCampusLocations(campus.value).length} 个地点`)
const interactiveMap = ref(null)
const nkZhixingPanel = ref(null)
const mapWorkspace = ref(null)
const mapSearchInput = ref(null)
const tourPanel = ref(null)
const directoryPanel = ref(null)
const directoryExpanded = ref(false)
const { photoDialog, activePhoto, photoFallback, openPhoto, closePhoto } = usePhotoDialog()
const liveNavigation = ref(false)
const voiceOutputEnabled = ref(false)
const livePosition = ref(null)
const activeNavigation = ref(null)
const activeTourId = ref('')
const activeTourStopIds = ref([])
const tourPlanning = ref(false)
const pendingTour = ref(null)
const searchRoutePlanning = ref(false)
const pendingSearchNavigation = ref(null)
const dismissedNearbyId = ref('')
const selectedLocationCard = ref(null)
let rerouteRequestId = 0
let tourRequestId = 0
let searchRouteRequestId = 0
let routeDrawVersion = 0
let tourController = null
let rerouteController = null
let searchRouteController = null
let disposed = false
const navigationSpeech = createNavigationSpeechTracker()

function announceNavigation(message) {
  if (voiceOutputEnabled.value && message) speakNkZhixingResult({ answer: message })
}

function handleNavigationCue(cue) {
  if (!liveNavigation.value || !activeNavigation.value) return
  announceNavigation(navigationSpeech.messageForCue(cue, activeNavigation.value.mode))
}

const currentCampus = computed(() => campusConfigs[campus.value])
const campusLocations = computed(() => getCampusLocations(campus.value))
const agentCampus = computed(() => ({ ...currentCampus.value, locations: campusLocations.value }))
const normalizedQuery = computed(() => query.value.trim().toLocaleLowerCase('zh-CN'))
const filteredLocations = computed(() => campusLocations.value.filter((location) => {
  const matchesCategory = category.value === 'all' || location.category === category.value
  const searchText = [
    location.number,
    location.name,
    location.description,
    ...(location.aliases || []),
  ].join(' ').toLocaleLowerCase('zh-CN')
  const matchesQuery = !normalizedQuery.value || searchText.includes(normalizedQuery.value)
  return matchesCategory && matchesQuery
}))
// Filtering changes emphasis and the directory, but never removes context from
// the map: unmatched places remain as small category-coloured dots.
const mapLocations = computed(() => campusLocations.value)
const campusToursForCurrentCampus = computed(() => campusTours[campus.value] || [])
const activeTour = computed(() => campusToursForCurrentCampus.value.find((tour) => tour.id === activeTourId.value) || null)
const activeTourStops = computed(() => activeTour.value
  ? activeTourStopIds.value.map((id) => campusLocations.value.find((location) => location.id === id)).filter(Boolean)
  : [])
const forcedMarkerIds = computed(() => (
  [...new Set([
    ...(category.value !== 'all' || normalizedQuery.value
      ? filteredLocations.value.map((location) => location.id)
      : []),
    ...candidateLocationIds.value,
    ...activeTourStops.value.map((location) => location.id),
  ])]
))
const selectedLocation = computed(() => campusLocations.value.find((location) => location.id === selectedId.value))
const mapGuideMessage = computed(() => {
  if (selectedLocation.value) return `已选择“${selectedLocation.value.name}”，可以开始导航。`
  if (livePosition.value) return '当前位置已就绪，请搜索或在地图上点选目标。'
  return '请先使用当前位置，再搜索或在地图上点选目标。'
})
const searchResults = computed(() => normalizedQuery.value ? filteredLocations.value.slice(0, 8) : [])
const geocodedCount = computed(() => campusLocations.value.filter((location) => location.geoPoint).length)
const nearbyProfileLocation = computed(() => {
  if (!livePosition.value) return null
  const currentPoint = [Number(livePosition.value.latitude), Number(livePosition.value.longitude)]
  if (!currentPoint.every(Number.isFinite)) return null

  return campusLocations.value
    .filter((location) => location.placeProfile && Array.isArray(location.geoPoint))
    .map((location) => ({
      location,
      distance: routePointDistance(currentPoint, location.geoPoint),
    }))
    .filter(({ location, distance }) => distance <= (location.placeProfile.nearbyRadiusMeters || 80))
    .sort((left, right) => left.distance - right.distance)[0] || null
})
const visibleNearbyProfile = computed(() => (
  nearbyProfileLocation.value?.location.id === dismissedNearbyId.value ? null : nearbyProfileLocation.value
))

function campusForPosition({ latitude, longitude }) {
  const pointLatitude = Number(latitude)
  const pointLongitude = Number(longitude)
  if (!Number.isFinite(pointLatitude) || !Number.isFinite(pointLongitude)) return null

  return Object.entries(campusConfigs).find(([, config]) => {
    const [[south, west], [north, east]] = config.geoBounds
    return pointLatitude >= south && pointLatitude <= north
      && pointLongitude >= west && pointLongitude <= east
  })?.[0] || null
}

async function handleLocationFound(position) {
  const detectedCampus = campusForPosition(position)
  if (!detectedCampus) {
    mapStatus.value = '已获取当前位置，但不在八里台或津南校区范围内；请手动选择校区。'
    return
  }

  const campusChanged = campus.value !== detectedCampus
  campus.value = detectedCampus
  baseMode.value = 'online'
  await nextTick()
  if (disposed || campus.value !== detectedCampus) return
  mapStatus.value = campusChanged
    ? `已根据当前位置切换到${campusConfigs[detectedCampus].name}在线地图。`
    : `已确认当前位置位于${campusConfigs[detectedCampus].name}。`
}

function handleLivePosition(position) {
  livePosition.value = position
  if (pendingSearchNavigation.value) {
    const request = pendingSearchNavigation.value
    pendingSearchNavigation.value = null
    if (campusForPosition(position) !== request.campus) {
      mapStatus.value = `当前位置不在${campusConfigs[request.campus].name}范围内，无法规划前往“${request.location.name}”的路线。`
      return
    }
    nextTick(() => navigateToSearchedLocation(request.location, { positionConfirmed: true }))
    return
  }
  if (!pendingTour.value) return
  const { tour, campus: requestedCampus } = pendingTour.value
  pendingTour.value = null
  if (campusForPosition(position) !== requestedCampus) {
    activeTourId.value = ''
    activeTourStopIds.value = []
    return
  }
  nextTick(() => showCampusTour(tour, { positionConfirmed: true }))
}

function handleMapSelection(locationId) {
  selectedId.value = locationId
  const location = campusLocations.value.find((item) => item.id === locationId)
  if (location) mapStatus.value = `已选择：${location.name}`
  if (candidateLocationIds.value.includes(locationId)) {
    nkZhixingPanel.value?.chooseCandidate(locationId)
    candidateLocationIds.value = []
  }
}

function clearMapSelection() {
  if (!selectedId.value) return
  selectedId.value = ''
  mapStatus.value = '已取消选择。'
}

function scrollToMap() {
  scrollToSection(mapWorkspace.value)
}

function scrollToSection(target) {
  if (!target) return
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  target.scrollIntoView({ behavior, block: 'start' })
}

function scrollToAgent() {
  scrollToSection(nkZhixingPanel.value?.$el)
}

function useCurrentPosition() {
  interactiveMap.value?.locateUser()
}

function chooseDestination() {
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  mapSearchInput.value?.scrollIntoView({ behavior, block: 'center' })
  requestAnimationFrame(() => mapSearchInput.value?.focus())
}

function askAgentAboutQuery() {
  const placeName = query.value.trim()
  if (!placeName) return
  nkZhixingPanel.value?.setQuestion(`我想找${placeName}，请帮我确认它在${currentCampus.value.name}的位置。`)
  scrollToAgent()
}

function scrollToTours() {
  scrollToSection(tourPanel.value)
}

function scrollToDirectory() {
  scrollToSection(directoryPanel.value)
}

async function selectAndFocus(location, shouldScroll = false) {
  selectedId.value = location.id
  await nextTick()
  if (disposed || selectedId.value !== location.id) return
  const focused = interactiveMap.value?.focusLocation(location.id, true)
  if (!focused) return
  mapStatus.value = `已定位到：${location.name}`
  if (shouldScroll) requestAnimationFrame(scrollToMap)
}

async function openNearbyProfile() {
  const location = visibleNearbyProfile.value?.location
  if (!location) return
  await selectAndFocus(location)
  await nextTick()
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  selectedLocationCard.value?.scrollIntoView({ behavior, block: 'center' })
}

function handleCoordinateUnavailable(location) {
  mapStatus.value = location.geoPoint
    ? `${location.name}不在校园导览图的编号范围内，请切换到“在线地图”查看现场核验位置。`
    : `${location.name}尚无经过核验的经纬度，请切换到“校园导览图”查看准确图上位置。`
}

function handleAgentFocus(locationId) {
  const location = campusLocations.value.find((item) => item.id === locationId)
  if (location) selectAndFocus(location, true)
}

async function showAgentCandidates(locations) {
  candidateLocationIds.value = locations.map((location) => location.id)
  const canUseOnlineMap = locations.every((location) => Array.isArray(location.geoPoint))
  if (canUseOnlineMap) baseMode.value = 'online'
  else baseMode.value = 'illustration'
  const mapLabel = canUseOnlineMap ? '在线地图' : '校园导览图'
  mapStatus.value = `已高亮 ${locations.map((location) => location.name).join('、')}，请在${mapLabel}中点击目标地点。`
  await nextTick()
  await nextTick()
  interactiveMap.value?.focusLocations(candidateLocationIds.value)
  requestAnimationFrame(scrollToMap)
}

function clearAgentCandidates() {
  candidateLocationIds.value = []
}

function cancelSearchRouteRequest() {
  searchRouteRequestId += 1
  searchRouteController?.abort()
  searchRouteController = null
  searchRoutePlanning.value = false
  pendingSearchNavigation.value = null
}

function cancelTourRequest() {
  tourRequestId += 1
  tourController?.abort()
  tourController = null
  tourPlanning.value = false
}

function cancelRerouteRequest() {
  rerouteRequestId += 1
  rerouteController?.abort()
  rerouteController = null
}

function formatRouteDistance(distanceMeters) {
  return distanceMeters >= 1000
    ? `${(distanceMeters / 1000).toFixed(1)} 公里`
    : `${Math.round(distanceMeters)} 米`
}

async function navigateToSearchedLocation(location, { positionConfirmed = false } = {}) {
  if (!location || searchRoutePlanning.value || pendingSearchNavigation.value) return
  await selectAndFocus(location)

  if (!positionConfirmed) {
    cancelTourRequest()
    pendingTour.value = null
    activeTourId.value = ''
    activeTourStopIds.value = []
    const request = { location, campus: campus.value }
    pendingSearchNavigation.value = request
    mapStatus.value = `正在获取当前位置，以规划前往“${location.name}”的步行路线…`
    const started = interactiveMap.value?.locateUser({
      onError: () => {
        if (pendingSearchNavigation.value !== request) return
        pendingSearchNavigation.value = null
        mapStatus.value = '未能获取当前位置，请允许浏览器使用定位后重试。'
      },
    })
    if (started === false) {
      pendingSearchNavigation.value = null
      mapStatus.value = '当前浏览器无法获取位置，暂时不能从当前位置规划路线。'
    }
    return
  }

  const currentPoint = [Number(livePosition.value?.latitude), Number(livePosition.value?.longitude)]
  if (!currentPoint.every(Number.isFinite)) {
    mapStatus.value = '未获得有效的实时位置，暂时无法规划路线。'
    return
  }
  const requestCampus = campus.value
  if (campusForPosition({ latitude: currentPoint[0], longitude: currentPoint[1] }) !== requestCampus) {
    mapStatus.value = `当前位置不在${currentCampus.value.name}范围内，无法规划校内路线。`
    return
  }

  cancelTourRequest()
  cancelRerouteRequest()
  cancelSearchRouteRequest()
  const requestId = ++searchRouteRequestId
  const controller = new AbortController()
  searchRouteController = controller
  searchRoutePlanning.value = true
  routeDrawVersion += 1
  activeTourId.value = ''
  activeTourStopIds.value = []
  candidateLocationIds.value = []
  activeNavigation.value = null
  try {
    mapStatus.value = `正在高德地图中确认“${location.name}”…`
    const destinationPoint = await resolveCampusPlace({
      campus: requestCampus,
      name: location.name,
      locationId: location.id,
    }, { signal: controller.signal })
    if (disposed || requestId !== searchRouteRequestId || campus.value !== requestCampus) return

    const originPoint = wgs84ToGcj02(currentPoint)
    if (!originPoint) throw new Error('当前位置坐标格式无效，无法规划路线。')
    mapStatus.value = `已在高德地图中确认“${location.name}”，正在规划步行路线…`
    const routeResult = await getRoute({
      origin: `${originPoint[1]},${originPoint[0]}`,
      destination: `${destinationPoint[1]},${destinationPoint[0]}`,
      campus: requestCampus,
      mode: 'walking',
    }, { signal: controller.signal })
    if (disposed || requestId !== searchRouteRequestId || campus.value !== requestCampus) return
    if (!await ensureOnlineMap() || requestId !== searchRouteRequestId) return

    interactiveMap.value?.clearRoute()
    if (!interactiveMap.value?.showRoute(routeResult.routePoints, routeResult.coordinateSystem)) {
      throw new Error('路线已生成，但当前在线地图无法绘制，请稍后重试。')
    }
    activeNavigation.value = {
      destination: {
        ...location,
        navigationPoint: destinationPoint,
        routeSource: `高德地图地点检索：${location.name}`,
      },
      mode: 'walking',
    }
    navigationSpeech.reset()
    const distance = formatRouteDistance(Number(routeResult.distanceMeters) || 0)
    const duration = Math.max(1, Math.round((Number(routeResult.durationSeconds) || 0) / 60))
    mapStatus.value = `已按高德地图中的“${location.name}”生成从当前位置出发的步行路线：约 ${distance}，约 ${duration} 分钟。`
    requestAnimationFrame(scrollToMap)
  } catch (error) {
    if (disposed || requestId !== searchRouteRequestId || controller.signal.aborted) return
    mapStatus.value = error.message || `未能在高德地图中确认“${location.name}”，请换用更完整的地点名称。`
  } finally {
    if (requestId === searchRouteRequestId) {
      searchRoutePlanning.value = false
      searchRouteController = null
    }
  }
}

async function ensureOnlineMap() {
  baseMode.value = 'online'
  await nextTick()
  await interactiveMap.value?.whenReady()
  return !disposed && baseMode.value === 'online'
}

async function handleAgentRoute(route) {
  cancelTourRequest()
  cancelRerouteRequest()
  cancelSearchRouteRequest()
  const version = ++routeDrawVersion
  activeTourId.value = ''
  activeTourStopIds.value = []
  pendingTour.value = null
  if (!await ensureOnlineMap() || version !== routeDrawVersion) return
  activeNavigation.value = route.destination ? {
    destination: route.destination,
    mode: route.mode || 'walking',
  } : null
  navigationSpeech.reset()
  const routeDrawn = interactiveMap.value?.showRoute(route.routePoints, route.coordinateSystem)
  if (!routeDrawn) {
    mapStatus.value = '已获得导航建议，但当前无法绘制路线，请在在线地图可用后重新规划。'
  }
}

async function showCampusTour(tour, { positionConfirmed = false } = {}) {
  if (tourPlanning.value) return
  if (!positionConfirmed) cancelSearchRouteRequest()
  const configuredStops = tour.stopIds
    .map((id) => campusLocations.value.find((location) => location.id === id))
    .filter((location) => location?.geoPoint)
  if (configuredStops.length < 2) {
    mapStatus.value = '该游览路线缺少可用坐标，暂时无法显示。'
    return
  }

  if (!positionConfirmed) {
    const request = { tour, campus: campus.value }
    pendingTour.value = request
    activeTourId.value = tour.id
    activeTourStopIds.value = []
    mapStatus.value = `正在获取实时位置，以选择“${tour.name}”较近的路线端点…`
    const started = interactiveMap.value?.locateUser({
      onError: () => {
        if (pendingTour.value !== request) return
        pendingTour.value = null
        activeTourId.value = ''
        activeTourStopIds.value = []
      },
    })
    if (started === false) {
      pendingTour.value = null
      activeTourId.value = ''
      activeTourStopIds.value = []
    }
    return
  }

  const currentPoint = [Number(livePosition.value?.latitude), Number(livePosition.value?.longitude)]
  if (!currentPoint.every(Number.isFinite)) {
    activeTourId.value = ''
    activeTourStopIds.value = []
    mapStatus.value = '未获得有效的实时位置，暂时无法规划探索路线。'
    return
  }
  if (campusForPosition({ latitude: currentPoint[0], longitude: currentPoint[1] }) !== campus.value) {
    activeTourId.value = ''
    activeTourStopIds.value = []
    mapStatus.value = `当前位置不在${currentCampus.value.name}范围内，无法从当前位置接入这条探索路线。`
    return
  }

  const { stops, reversed } = orderStopsFromNearestEndpoint(configuredStops, currentPoint)
  const alreadyAtEndpoint = routePointDistance(currentPoint, stops[0].geoPoint) < 10
  const routeNodes = alreadyAtEndpoint
    ? stops
    : [{ id: 'current-position', name: '当前位置', geoPoint: currentPoint }, ...stops]

  const requestId = ++tourRequestId
  const requestCampus = campus.value
  const controller = new AbortController()
  tourController = controller
  cancelRerouteRequest()
  routeDrawVersion += 1
  tourPlanning.value = true
  activeTourId.value = tour.id
  activeTourStopIds.value = stops.map((stop) => stop.id)
  pendingTour.value = null
  candidateLocationIds.value = []
  activeNavigation.value = null
  try {
    if (!await ensureOnlineMap() || requestId !== tourRequestId || campus.value !== requestCampus) return
    interactiveMap.value?.clearRoute()
    mapStatus.value = `正在从当前位置接入“${tour.name}”较近的${reversed ? '终点' : '起点'}，并规划 ${routeNodes.length - 1} 段步行路线…`
    requestAnimationFrame(scrollToMap)
    const routePoints = []
    let distanceMeters = 0
    let durationSeconds = 0
    for (let index = 0; index < routeNodes.length - 1; index += 1) {
      const origin = wgs84ToGcj02(routeNodes[index].geoPoint)
      const destination = wgs84ToGcj02(routeNodes[index + 1].geoPoint)
      if (!origin || !destination) throw new Error('游览站点坐标格式无效，无法规划真实道路路线。')

      mapStatus.value = `正在规划第 ${index + 1}/${routeNodes.length - 1} 段：${routeNodes[index].name} → ${routeNodes[index + 1].name}…`
      const segment = await getRoute({
        origin: `${origin[1]},${origin[0]}`,
        destination: `${destination[1]},${destination[0]}`,
        campus: campus.value,
        mode: 'walking',
      }, { signal: controller.signal })
      if (disposed || requestId !== tourRequestId) return
      if (!Array.isArray(segment.routePoints) || segment.routePoints.length < 2) {
        throw new Error(`未获取到“${routeNodes[index].name} → ${routeNodes[index + 1].name}”的真实步行路线。`)
      }
      const directDistance = routePointDistance(routeNodes[index].geoPoint, routeNodes[index + 1].geoPoint)
      const maximumCampusDistance = Math.max(600, directDistance * 3)
      if (!Number.isFinite(segment.distanceMeters) || segment.distanceMeters > maximumCampusDistance) {
        throw new Error(`“${routeNodes[index].name} → ${routeNodes[index + 1].name}”被导航服务绕至校外，未绘制不符合校园实际的路线。`)
      }

      routePoints.push(...segment.routePoints.slice(routePoints.length ? 1 : 0))
      distanceMeters += Number(segment.distanceMeters) || 0
      durationSeconds += Number(segment.durationSeconds) || 0
    }

    if (disposed || requestId !== tourRequestId) return
    if (!interactiveMap.value?.showRoute(routePoints, 'GCJ-02')) {
      throw new Error('当前无法显示完整路线，请在在线地图可用后重试。')
    }
    const distance = distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(1)} 公里` : `${Math.round(distanceMeters)} 米`
    const duration = Math.max(1, Math.round(durationSeconds / 60))
    mapStatus.value = `已从当前位置接入“${tour.name}”较近的${reversed ? '终点' : '起点'}，并按真实步行道路绘制完整路线：约 ${distance}，约 ${duration} 分钟。`
  } catch (error) {
    if (disposed || requestId !== tourRequestId || controller.signal.aborted) return
    interactiveMap.value?.clearRoute()
    activeTourId.value = ''
    activeTourStopIds.value = []
    mapStatus.value = error.message || '未能获取完整的真实步行路线，未绘制站点直线。'
  } finally {
    if (requestId === tourRequestId) {
      tourPlanning.value = false
      tourController = null
    }
  }
}

function clearCampusTour() {
  cancelTourRequest()
  activeTourId.value = ''
  activeTourStopIds.value = []
  pendingTour.value = null
  interactiveMap.value?.clearRoute()
  mapStatus.value = '已关闭校史游览路线。'
}

async function rerouteFromCurrentPosition({ latitude, longitude, deviationMeters }) {
  const navigation = activeNavigation.value
  const destination = navigation?.destination?.navigationPoint
  if (!liveNavigation.value || !destination) return

  const origin = wgs84ToGcj02([latitude, longitude])
  if (!origin) return
  cancelRerouteRequest()
  const requestId = ++rerouteRequestId
  const controller = new AbortController()
  rerouteController = controller
  mapStatus.value = `检测到偏离路线约 ${deviationMeters} 米，正在重新规划…`
  announceNavigation(`检测到已偏离原路线约 ${deviationMeters} 米，正在重新规划，请注意周边环境。`)
  try {
    const routeResult = await getRoute({
      origin: `${origin[1]},${origin[0]}`,
      destination: `${destination[1]},${destination[0]}`,
      campus: campus.value,
      mode: navigation.mode,
    }, { signal: controller.signal })
    if (disposed || requestId !== rerouteRequestId || activeNavigation.value !== navigation) return
    navigationSpeech.reset()
    if (!interactiveMap.value?.showRoute(routeResult.routePoints, routeResult.coordinateSystem)) return
    const routeSteps = routeResult.instructions.length
      ? routeResult.instructions
      : routeInstructionsFromGeometry(routeResult.routePoints)
    const source = navigation.destination.routeSource
    mapStatus.value = source
      ? `已根据当前位置重新规划路线（高德地图路线；目的地：${source}）。`
      : '已根据当前位置重新规划路线。'
    announceNavigation(`路线已重新规划。${routeSteps[0] || '请沿地图中的新路线继续前行。'}`)
  } catch (error) {
    if (!disposed && requestId === rerouteRequestId && !controller.signal.aborted) {
      mapStatus.value = error.message
      announceNavigation('路线重新规划失败，请停留在安全位置，查看地图后重试。')
    }
  } finally {
    if (requestId === rerouteRequestId) rerouteController = null
  }
}

function setBaseMode(mode) {
  if (mode === 'illustration' && baseMode.value !== mode) {
    cancelTourRequest()
    cancelRerouteRequest()
    cancelSearchRouteRequest()
    routeDrawVersion += 1
    activeTourId.value = ''
    activeTourStopIds.value = []
    pendingTour.value = null
    activeNavigation.value = null
  }
  baseMode.value = mode
  mapStatus.value = mode === 'online'
    ? '已切换到在线地图。'
    : '已切换到校园导览图。'
}

function handleOnlineMapUnavailable() {
  if (baseMode.value !== 'online') return
  setBaseMode('illustration')
  mapStatus.value = '当前网络无法加载在线底图，已自动切换到校园导览图；地点检索可继续使用，路线轨迹请在网络恢复后重试。'
}

async function startLiveNavigation() {
  const requestCampus = campus.value
  if (await ensureOnlineMap() && campus.value === requestCampus) interactiveMap.value?.startLiveNavigation()
}

function stopLiveNavigation() {
  interactiveMap.value?.stopLiveNavigation()
  livePosition.value = null
  activeNavigation.value = null
  activeTourId.value = ''
  activeTourStopIds.value = []
  pendingTour.value = null
  cancelTourRequest()
  cancelRerouteRequest()
  cancelSearchRouteRequest()
  routeDrawVersion += 1
}

function handleLiveNavigationChange(isLive) {
  const wasLive = liveNavigation.value
  liveNavigation.value = isLive
  navigationSpeech.reset()
  if (isLive && !wasLive) {
    announceNavigation(activeNavigation.value
      ? '实时导航已开启，将在转向和偏离路线时提醒你。'
      : '实时导航已开启，请先规划一条路线。')
  }
  if (!isLive && wasLive) {
    livePosition.value = null
    activeNavigation.value = null
    cancelRerouteRequest()
  }
}

watch(campus, () => {
  if (liveNavigation.value) stopLiveNavigation()
  closePhoto()
  selectedId.value = ''
  query.value = ''
  category.value = 'all'
  candidateLocationIds.value = []
  activeTourId.value = ''
  activeTourStopIds.value = []
  pendingTour.value = null
  activeNavigation.value = null
  cancelTourRequest()
  cancelRerouteRequest()
  cancelSearchRouteRequest()
  routeDrawVersion += 1
  dismissedNearbyId.value = ''
  mapStatus.value = `${currentCampus.value.name} · ${campusLocations.value.length} 个地点`
})

watch(() => nearbyProfileLocation.value?.location.id, (locationId) => {
  if (locationId !== dismissedNearbyId.value) dismissedNearbyId.value = ''
})

watch(category, () => {
  if (selectedLocation.value && !filteredLocations.value.some((item) => item.id === selectedId.value)) {
    selectedId.value = ''
  }
})

onBeforeUnmount(() => {
  disposed = true
  routeDrawVersion += 1
  cancelTourRequest()
  cancelRerouteRequest()
  cancelSearchRouteRequest()
})
</script>

<template>
  <div class="page inner-page map-page">
    <header class="page-header">
      <span class="section-kicker"><i></i> CAMPUS MAP</span>
      <h1>交互式校园地图</h1>
      <p>在校园导览图与在线地图之间切换，通过点选标号快速确认常用建筑。</p>
    </header>

    <section class="campus-switcher" aria-labelledby="campus-title">
      <div class="section-heading compact">
        <span class="section-kicker"><i></i> 选择校区</span>
        <h2 id="campus-title">你现在在哪个校区？</h2>
      </div>
      <div class="campus-tabs" role="group" aria-label="校区切换">
        <button
          v-for="(data, key) in campusConfigs"
          :key="key"
          type="button"
          :aria-pressed="campus === key"
          :class="{ active: campus === key }"
          @click="campus = key"
        >{{ data.name }}</button>
      </div>
    </section>

    <nav class="map-mobile-jump" aria-label="地图页面快捷导航">
      <button type="button" @click="scrollToMap">地图</button>
      <button type="button" @click="scrollToAgent">问智行</button>
      <button type="button" @click="scrollToTours">探索路线</button>
      <button type="button" @click="scrollToDirectory">地点</button>
    </nav>

    <section class="map-experience" aria-labelledby="interactive-map-title">
      <div class="map-experience-heading">
        <div class="section-heading compact">
          <span class="section-kicker"><i></i> INTERACTIVE VIEW</span>
          <h2 id="interactive-map-title">{{ currentCampus.name }}</h2>
        </div>
        <label class="map-search">
          <span class="sr-only">搜索建筑编号或名称</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m16.5 16.5 4 4"></path></svg>
          <input ref="mapSearchInput" v-model="query" type="search" placeholder="搜索编号、名称或简称" autocomplete="off" />
          <small>{{ filteredLocations.length }} 个地点</small>
        </label>
      </div>

      <div v-if="searchResults.length" class="map-search-results" aria-label="建筑搜索结果">
        <div
          v-for="location in searchResults"
          :key="location.id"
          class="map-search-result"
        >
          <button type="button" class="map-search-result-main" @click="selectAndFocus(location)">
            <span>{{ location.number }}</span>
            <strong>{{ location.name }}</strong>
            <small>{{ categoryMeta[location.category].label }}</small>
          </button>
          <button
            type="button"
            class="map-search-result-nav"
            :disabled="searchRoutePlanning || Boolean(pendingSearchNavigation)"
            :aria-label="`从当前位置导航到${location.name}`"
            @click="navigateToSearchedLocation(location)"
          >{{ pendingSearchNavigation?.location.id === location.id ? '正在定位…' : searchRoutePlanning && selectedId === location.id ? '正在规划…' : '从当前位置导航' }}</button>
        </div>
      </div>
      <div v-else-if="normalizedQuery" class="map-empty-result" role="status">
        <p>没有找到匹配的建筑。可尝试简称、楼宇编号或名称中的其他关键词。</p>
        <button type="button" @click="askAgentAboutQuery">向 NK 智行继续查询</button>
      </div>

      <section class="map-start-hint" aria-label="地图使用引导" aria-live="polite">
        <p><strong>下一步：</strong>{{ mapGuideMessage }}</p>
        <div>
          <button type="button" class="map-start-locate" :class="{ 'is-done': livePosition }" @click="useCurrentPosition">
            {{ livePosition ? '✓ 已获取当前位置' : '1. 使用当前位置' }}
          </button>
          <button type="button" :class="{ 'is-current': livePosition && !selectedLocation }" @click="chooseDestination">
            {{ selectedLocation ? '✓ 已选目标' : '2. 搜索或点选目标' }}
          </button>
          <button
            v-if="selectedLocation"
            type="button"
            class="map-start-navigation"
            :disabled="searchRoutePlanning || Boolean(pendingSearchNavigation)"
            @click="navigateToSearchedLocation(selectedLocation)"
          >{{ searchRoutePlanning || pendingSearchNavigation ? '正在准备路线…' : `3. 导航到${selectedLocation.name}` }}</button>
        </div>
      </section>

      <div ref="mapWorkspace" class="campus-map-workspace">
        <CampusInteractiveMap
          ref="interactiveMap"
          :campus="currentCampus"
          :locations="mapLocations"
          :base-mode="baseMode"
          :selected-id="selectedId"
          :forced-ids="forcedMarkerIds"
          :candidate-ids="candidateLocationIds"
          :tour-stop-ids="activeTourStopIds"
          :current-position="livePosition"
          :request-initial-location="true"
          @select="handleMapSelection"
          @clear-selection="clearMapSelection"
          @status="mapStatus = $event"
          @live-navigation-change="handleLiveNavigationChange"
          @live-position="handleLivePosition"
          @location-found="handleLocationFound"
          @navigation-cue="handleNavigationCue"
          @route-deviation="rerouteFromCurrentPosition"
          @coordinate-unavailable="handleCoordinateUnavailable"
          @online-map-unavailable="handleOnlineMapUnavailable"
        />
        <CampusMapControls
          :base-mode="baseMode"
          :category="category"
          :location-status="mapStatus"
          :live-navigation="liveNavigation"
          @update:base-mode="setBaseMode"
          @update:category="category = $event"
          @reset="interactiveMap?.resetView()"
          @locate="interactiveMap?.locateUser()"
          @start-live-navigation="startLiveNavigation"
          @stop-live-navigation="stopLiveNavigation"
        />
      </div>

      <div class="map-caption">
        <span aria-hidden="true">!</span>
        <p>
          <strong>{{ currentCampus.sourceLabel }}</strong>
          <template v-if="baseMode === 'online'"> · {{ geocodedCount }} 个在线点位。</template>
          <template v-if="currentCampus.numberingNote"> {{ currentCampus.numberingNote }}</template>
          紧急情况以学校官方通知和现场人员指引为准。
        </p>
      </div>

      <aside v-if="selectedLocation" class="selected-location-quick" aria-live="polite">
        <div>
          <small>已选目标</small>
          <strong>{{ selectedLocation.name }}</strong>
        </div>
        <button
          type="button"
          :disabled="searchRoutePlanning || Boolean(pendingSearchNavigation)"
          @click="navigateToSearchedLocation(selectedLocation)"
        >{{ pendingSearchNavigation ? '正在定位…' : searchRoutePlanning ? '正在规划…' : '从当前位置导航' }}</button>
      </aside>

      <aside v-if="visibleNearbyProfile" class="nearby-place-notice" aria-live="polite">
        <span class="nearby-place-distance">附近 · 约 {{ Math.max(1, Math.round(visibleNearbyProfile.distance)) }} 米</span>
        <div>
          <strong>你已靠近{{ visibleNearbyProfile.location.name }}</strong>
          <p>{{ visibleNearbyProfile.location.placeProfile.brief }}</p>
        </div>
        <button type="button" @click="openNearbyProfile">查看介绍</button>
        <button
          type="button"
          class="nearby-place-dismiss"
          aria-label="关闭附近建筑提示"
          @click="dismissedNearbyId = visibleNearbyProfile.location.id"
        >×</button>
      </aside>

      <NkZhixingAgentPanel
        ref="nkZhixingPanel"
        :campus="agentCampus"
        :selected-location="selectedLocation"
        :live-navigation="liveNavigation"
        :live-position="livePosition"
        :initial-message="agentHandoff?.message"
        :auto-submit="Boolean(agentHandoff?.message)"
        @focus-location="handleAgentFocus"
        @show-route="handleAgentRoute"
        @route-status="mapStatus = $event"
        @show-candidates="showAgentCandidates"
        @clear-candidates="clearAgentCandidates"
        @voice-output-change="voiceOutputEnabled = $event"
      />

      <section v-if="campusToursForCurrentCampus.length" ref="tourPanel" class="campus-tour-panel" aria-label="校园游览路线">
        <div class="campus-tour-heading">
          <span class="section-kicker"><i></i> CAMPUS TOUR</span>
          <h3>{{ currentCampus.name }}主题探索路线</h3>
          <p>选择路线后，系统会以当前位置为起点，先导航至距离更近的路线端点，再按真实步行道路完成整条路线。</p>
        </div>
        <div class="campus-tour-grid">
          <article v-for="tour in campusToursForCurrentCampus" :key="tour.id" :class="{ active: activeTourId === tour.id }">
            <h4>{{ tour.name }}</h4>
            <p>{{ tour.summary }}</p>
            <p v-if="activeTourId === tour.id" class="campus-tour-introduction" aria-live="polite">
              <strong>路线导语</strong>{{ tour.introduction }}
            </p>
            <button type="button" :disabled="tourPlanning || Boolean(pendingTour)" @click="showCampusTour(tour)">
              {{ pendingTour?.tour.id === tour.id ? '正在获取位置…' : tourPlanning && activeTourId === tour.id ? '正在按道路规划…' : activeTourId === tour.id ? '已在地图显示' : '从当前位置规划' }}
            </button>
          </article>
        </div>
        <div v-if="activeTour" class="campus-tour-actions">
          <button type="button" @click="clearCampusTour">关闭当前路线</button>
        </div>
        <ol v-if="activeTourStops.length" class="campus-tour-stops">
          <li v-for="(location, index) in activeTourStops" :key="location.id">
            <button type="button" @click="selectAndFocus(location, true)"><b>{{ index + 1 }}</b>{{ location.name }}</button>
          </li>
        </ol>
      </section>
    </section>

    <section v-if="selectedLocation" ref="selectedLocationCard" class="selected-location-card" aria-live="polite">
      <div :class="`selected-location-number category-${selectedLocation.category}`">
        <small>{{ selectedLocation.number }}</small>
        <span aria-hidden="true">{{ categoryMeta[selectedLocation.category].symbol }}</span>
      </div>
      <div>
        <span>{{ categoryMeta[selectedLocation.category].label }} · {{ currentCampus.name }}</span>
        <h2>{{ selectedLocation.name }}</h2>
        <p>{{ selectedLocation.description }}</p>
        <div v-if="selectedLocation.placeProfile" class="place-profile-detail">
          <span>{{ selectedLocation.placeProfile.kind || '校园地点' }}</span>
          <h3>{{ selectedLocation.placeProfile.title }}</h3>
          <p>{{ selectedLocation.placeProfile.brief }}</p>
          <p>{{ selectedLocation.placeProfile.facts }}</p>
          <div v-if="selectedLocation.placeProfile.sources?.length" class="place-profile-sources">
            <a
              v-for="source in selectedLocation.placeProfile.sources"
              :key="`${source.type}-${source.label}`"
              :href="source.url"
              :target="source.url.startsWith('http') ? '_blank' : undefined"
              :rel="source.url.startsWith('http') ? 'noopener' : undefined"
            >{{ source.type }} · {{ source.label }} →</a>
          </div>
        </div>
        <small v-if="baseMode === 'online' && !selectedLocation.geoPoint">该地点目前仅提供校园导览图坐标。</small>
      </div>
      <div class="selected-location-actions">
        <button type="button" @click="selectAndFocus(selectedLocation, true)">在地图中定位</button>
        <button
          type="button"
          :disabled="searchRoutePlanning || Boolean(pendingSearchNavigation)"
          @click="navigateToSearchedLocation(selectedLocation)"
        >{{ pendingSearchNavigation?.location.id === selectedLocation.id ? '正在获取位置…' : searchRoutePlanning ? '正在高德规划…' : '从当前位置导航' }}</button>
      </div>
      <div v-if="selectedLocation.photos?.length" class="location-photo-gallery">
        <div class="location-photo-heading">
          <span>地点实景</span>
          <small>{{ selectedLocation.photos.length }} 张 · 点击照片查看大图</small>
        </div>
        <div class="location-photo-grid">
          <button
            v-for="photo in selectedLocation.photos"
            :key="photo.src"
            type="button"
            @click="openPhoto(photo, $event.currentTarget)"
          >
            <img :src="photo.src" :alt="photo.alt" loading="lazy" decoding="async" />
            <span>{{ photo.caption }}</span>
          </button>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="activePhoto && photoFallback" class="location-photo-backdrop" aria-hidden="true" @click="closePhoto"></div>
      <dialog
        v-show="activePhoto"
        ref="photoDialog"
        class="location-photo-dialog"
        :class="{ 'is-fallback': photoFallback }"
        role="dialog"
        aria-modal="true"
        aria-label="地点实景大图"
        @cancel.prevent="closePhoto"
        @click.self="closePhoto"
        @close="!photoDialog?.open && closePhoto()"
      >
        <button type="button" class="location-photo-close" aria-label="关闭实景照片" @click="closePhoto">×</button>
        <figure v-if="activePhoto">
          <img :src="activePhoto.src" :alt="activePhoto.alt" />
          <figcaption>{{ activePhoto.caption }}</figcaption>
        </figure>
      </dialog>
    </Teleport>

    <section ref="directoryPanel" class="map-directory" aria-labelledby="directory-title">
      <div class="map-directory-heading">
        <div class="section-heading compact">
          <span class="section-kicker"><i></i> LOCATION INDEX</span>
          <h2 id="directory-title">{{ currentCampus.short }}地点索引</h2>
        </div>
        <button
          type="button"
          class="map-directory-toggle"
          :aria-expanded="directoryExpanded"
          aria-controls="campus-location-directory"
          @click="directoryExpanded = !directoryExpanded"
        >{{ directoryExpanded ? '收起地点' : `展开 ${filteredLocations.length} 个地点` }}</button>
      </div>
      <div
        id="campus-location-directory"
        class="map-directory-grid"
        :class="{ 'mobile-collapsed': !directoryExpanded }"
      >
        <button
          v-for="location in filteredLocations"
          :key="location.id"
          type="button"
          :class="{ active: selectedId === location.id }"
          @click="selectAndFocus(location, true)"
        >
          <span :class="`category-${location.category}`">{{ location.number }}</span>
          <span><strong>{{ location.name }}</strong><small>{{ categoryMeta[location.category].label }}</small></span>
          <b aria-hidden="true">→</b>
        </button>
      </div>
    </section>

  </div>
</template>

<style scoped>
.location-photo-backdrop {
  position: fixed;
  z-index: 2000;
  inset: 0;
  background: rgba(20, 7, 18, .84);
}

.location-photo-dialog.is-fallback {
  position: fixed;
  z-index: 2001;
  top: 50%;
  left: 50%;
  margin: 0;
  transform: translate(-50%, -50%);
}
</style>

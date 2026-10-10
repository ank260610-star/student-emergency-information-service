<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import CampusInteractiveMap from '../components/CampusInteractiveMap.vue'
import CampusMapControls from '../components/CampusMapControls.vue'
import NkZhixingAgentPanel from '../components/NkZhixingAgentPanel.vue'
import { consumeNkZhixingHandoff, getRoute } from '../services/nkZhixingAgent'
import { wgs84ToGcj02 } from '../utils/mapUtils'
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
const photoDialog = ref(null)
const activePhoto = ref(null)
const liveNavigation = ref(false)
const livePosition = ref(null)
const activeNavigation = ref(null)
const activeTourId = ref('')
const tourPlanning = ref(false)
let rerouteRequestId = 0
let tourRequestId = 0

const currentCampus = computed(() => campusConfigs[campus.value])
const campusLocations = computed(() => getCampusLocations(campus.value))
const agentCampus = computed(() => ({ ...currentCampus.value, locations: campusLocations.value }))
const normalizedQuery = computed(() => query.value.trim().toLocaleLowerCase('zh-CN'))
const filteredLocations = computed(() => campusLocations.value.filter((location) => {
  const matchesCategory = category.value === 'all' || location.category === category.value
  const searchText = `${location.number} ${location.name} ${location.description}`.toLocaleLowerCase('zh-CN')
  const matchesQuery = !normalizedQuery.value || searchText.includes(normalizedQuery.value)
  return matchesCategory && matchesQuery
}))
// Filtering changes emphasis and the directory, but never removes context from
// the map: unmatched places remain as small category-coloured dots.
const mapLocations = computed(() => campusLocations.value)
const campusToursForCurrentCampus = computed(() => campusTours[campus.value] || [])
const activeTour = computed(() => campusToursForCurrentCampus.value.find((tour) => tour.id === activeTourId.value) || null)
const activeTourStops = computed(() => activeTour.value
  ? activeTour.value.stopIds.map((id) => campusLocations.value.find((location) => location.id === id)).filter(Boolean)
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
const searchResults = computed(() => normalizedQuery.value ? filteredLocations.value.slice(0, 8) : [])
const geocodedCount = computed(() => campusLocations.value.filter((location) => location.geoPoint).length)

function straightLineMeters(start, end) {
  const [startLatitude, startLongitude] = start || []
  const [endLatitude, endLongitude] = end || []
  if (![startLatitude, startLongitude, endLatitude, endLongitude].every(Number.isFinite)) return Number.POSITIVE_INFINITY
  const radians = Math.PI / 180
  const latitudeDelta = (endLatitude - startLatitude) * radians
  const longitudeDelta = (endLongitude - startLongitude) * radians
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLatitude * radians) * Math.cos(endLatitude * radians) * Math.sin(longitudeDelta / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  mapWorkspace.value?.scrollIntoView({ behavior, block: 'start' })
}

async function selectAndFocus(location, shouldScroll = false) {
  selectedId.value = location.id
  await nextTick()
  const focused = interactiveMap.value?.focusLocation(location.id, true)
  if (!focused) return
  mapStatus.value = `已定位到：${location.name}`
  if (shouldScroll) requestAnimationFrame(scrollToMap)
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

function showAgentCandidates(locations) {
  candidateLocationIds.value = locations.map((location) => location.id)
  const canUseOnlineMap = locations.every((location) => Array.isArray(location.geoPoint))
  if (canUseOnlineMap) baseMode.value = 'online'
  else baseMode.value = 'illustration'
  const mapLabel = canUseOnlineMap ? '在线地图' : '校园导览图'
  mapStatus.value = `已高亮 ${locations.map((location) => location.name).join('、')}，请在${mapLabel}中点击目标地点。`
  requestAnimationFrame(scrollToMap)
}

function clearAgentCandidates() {
  candidateLocationIds.value = []
}

async function handleAgentRoute(route) {
  tourRequestId += 1
  tourPlanning.value = false
  activeTourId.value = ''
  if (baseMode.value !== 'online') {
    baseMode.value = 'online'
    await nextTick()
    // CampusInteractiveMap rebuilds the Leaflet instance after its prop changes.
    // Wait for that second render pass before asking the new instance to draw.
    await nextTick()
  }
  const routeDrawn = interactiveMap.value?.showRoute(route.routePoints, route.coordinateSystem)
  if (!routeDrawn) {
    mapStatus.value = '已获得导航建议，但当前网络无法加载在线底图，路线轨迹将在在线地图可用时显示。'
  }
  activeNavigation.value = route.destination ? {
    destination: route.destination,
    mode: route.mode || 'walking',
  } : null
}

async function showCampusTour(tour) {
  if (tourPlanning.value) return
  const stops = tour.stopIds
    .map((id) => campusLocations.value.find((location) => location.id === id))
    .filter((location) => location?.geoPoint)
  if (stops.length < 2) {
    mapStatus.value = '该游览路线缺少可用坐标，暂时无法显示。'
    return
  }

  const requestId = ++tourRequestId
  activeTourId.value = tour.id
  candidateLocationIds.value = []
  activeNavigation.value = null
  if (baseMode.value !== 'online') {
    baseMode.value = 'online'
    await nextTick()
    await nextTick()
  }
  interactiveMap.value?.clearRoute()
  tourPlanning.value = true
  mapStatus.value = `正在按道路网络规划“${tour.name}”的 ${stops.length - 1} 段步行路线…`
  requestAnimationFrame(scrollToMap)

  try {
    const routePoints = []
    let distanceMeters = 0
    let durationSeconds = 0
    for (let index = 0; index < stops.length - 1; index += 1) {
      const origin = wgs84ToGcj02(stops[index].geoPoint)
      const destination = wgs84ToGcj02(stops[index + 1].geoPoint)
      if (!origin || !destination) throw new Error('游览站点坐标格式无效，无法规划真实道路路线。')

      mapStatus.value = `正在规划第 ${index + 1}/${stops.length - 1} 段：${stops[index].name} → ${stops[index + 1].name}…`
      const segment = await getRoute({
        origin: `${origin[1]},${origin[0]}`,
        destination: `${destination[1]},${destination[0]}`,
        mode: 'walking',
      })
      if (requestId !== tourRequestId) return
      if (!Array.isArray(segment.routePoints) || segment.routePoints.length < 2) {
        throw new Error(`未获取到“${stops[index].name} → ${stops[index + 1].name}”的真实步行路线。`)
      }
      const directDistance = straightLineMeters(stops[index].geoPoint, stops[index + 1].geoPoint)
      const maximumCampusDistance = Math.max(600, directDistance * 3)
      if (!Number.isFinite(segment.distanceMeters) || segment.distanceMeters > maximumCampusDistance) {
        throw new Error(`“${stops[index].name} → ${stops[index + 1].name}”被导航服务绕至校外，未绘制不符合校园实际的路线。`)
      }

      routePoints.push(...segment.routePoints.slice(routePoints.length ? 1 : 0))
      distanceMeters += Number(segment.distanceMeters) || 0
      durationSeconds += Number(segment.durationSeconds) || 0
    }

    if (requestId !== tourRequestId) return
    interactiveMap.value?.showRoute(routePoints, 'GCJ-02')
    const distance = distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(1)} 公里` : `${Math.round(distanceMeters)} 米`
    const duration = Math.max(1, Math.round(durationSeconds / 60))
    mapStatus.value = `已按真实步行道路绘制“${tour.name}”：约 ${distance}，约 ${duration} 分钟。`
  } catch (error) {
    if (requestId !== tourRequestId) return
    interactiveMap.value?.clearRoute()
    activeTourId.value = ''
    mapStatus.value = error.message || '未能获取完整的真实步行路线，未绘制站点直线。'
  } finally {
    if (requestId === tourRequestId) tourPlanning.value = false
  }
}

function clearCampusTour() {
  tourRequestId += 1
  tourPlanning.value = false
  activeTourId.value = ''
  interactiveMap.value?.clearRoute()
  mapStatus.value = '已关闭校史游览路线。'
}

async function rerouteFromCurrentPosition({ latitude, longitude, deviationMeters }) {
  const navigation = activeNavigation.value
  const destination = navigation?.destination?.navigationPoint
  if (!liveNavigation.value || !destination) return

  const origin = wgs84ToGcj02([latitude, longitude])
  if (!origin) return
  const requestId = ++rerouteRequestId
  mapStatus.value = `检测到偏离路线约 ${deviationMeters} 米，正在重新规划…`
  try {
    const routeResult = await getRoute({
      origin: `${origin[1]},${origin[0]}`,
      destination: `${destination[1]},${destination[0]}`,
      mode: navigation.mode,
    })
    if (requestId !== rerouteRequestId) return
    interactiveMap.value?.showRoute(routeResult.routePoints, routeResult.coordinateSystem)
    mapStatus.value = '已根据当前位置重新规划路线。'
  } catch (error) {
    if (requestId === rerouteRequestId) mapStatus.value = error.message
  }
}

async function openPhoto(photo) {
  activePhoto.value = photo
  await nextTick()
  photoDialog.value?.showModal()
}

function closePhoto() {
  if (photoDialog.value?.open) photoDialog.value.close()
}

function setBaseMode(mode) {
  baseMode.value = mode
  mapStatus.value = mode === 'online'
    ? '已切换到在线地图。'
    : '已切换到校园导览图。'
}

function handleOnlineMapUnavailable() {
  if (baseMode.value !== 'online') return
  baseMode.value = 'illustration'
  mapStatus.value = '当前网络无法加载在线底图，已自动切换到校园导览图；地点检索可继续使用，路线轨迹请在网络恢复后重试。'
}

async function startLiveNavigation() {
  if (baseMode.value !== 'online') {
    baseMode.value = 'online'
    await nextTick()
  }
  interactiveMap.value?.startLiveNavigation()
}

function stopLiveNavigation() {
  interactiveMap.value?.stopLiveNavigation()
  livePosition.value = null
  activeNavigation.value = null
  activeTourId.value = ''
  tourRequestId += 1
  tourPlanning.value = false
  rerouteRequestId += 1
}

function handleLiveNavigationChange(isLive) {
  liveNavigation.value = isLive
  if (!isLive) {
    livePosition.value = null
    activeNavigation.value = null
    rerouteRequestId += 1
  }
}

watch(campus, () => {
  stopLiveNavigation()
  closePhoto()
  selectedId.value = ''
  query.value = ''
  category.value = 'all'
  activeTourId.value = ''
  tourRequestId += 1
  tourPlanning.value = false
  mapStatus.value = `${currentCampus.value.name} · ${campusLocations.value.length} 个地点`
})

watch(category, () => {
  if (selectedLocation.value && !filteredLocations.value.some((item) => item.id === selectedId.value)) {
    selectedId.value = ''
  }
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

    <section class="map-experience" aria-labelledby="interactive-map-title">
      <div class="map-experience-heading">
        <div class="section-heading compact">
          <span class="section-kicker"><i></i> INTERACTIVE VIEW</span>
          <h2 id="interactive-map-title">{{ currentCampus.name }}</h2>
        </div>
        <label class="map-search">
          <span class="sr-only">搜索建筑编号或名称</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m16.5 16.5 4 4"></path></svg>
          <input v-model="query" type="search" placeholder="搜索编号或建筑名称" autocomplete="off" />
          <small>{{ filteredLocations.length }} 个地点</small>
        </label>
      </div>

      <div v-if="searchResults.length" class="map-search-results" aria-label="建筑搜索结果">
        <button
          v-for="location in searchResults"
          :key="location.id"
          type="button"
          @click="selectAndFocus(location)"
        >
          <span>{{ location.number }}</span>
          <strong>{{ location.name }}</strong>
          <small>{{ categoryMeta[location.category].label }}</small>
        </button>
      </div>
      <p v-else-if="normalizedQuery" class="map-empty-result" role="status">没有找到匹配的建筑，请尝试名称中的其他关键词。</p>

      <div ref="mapWorkspace" class="campus-map-workspace">
        <CampusInteractiveMap
          ref="interactiveMap"
          :campus="currentCampus"
          :locations="mapLocations"
          :base-mode="baseMode"
          :selected-id="selectedId"
          :forced-ids="forcedMarkerIds"
          :candidate-ids="candidateLocationIds"
          :tour-stop-ids="activeTour?.stopIds || []"
          @select="handleMapSelection"
          @clear-selection="clearMapSelection"
          @status="mapStatus = $event"
          @live-navigation-change="handleLiveNavigationChange"
          @live-position="livePosition = $event"
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
      />

      <section v-if="campusToursForCurrentCampus.length" class="campus-tour-panel" aria-label="校园游览路线">
        <div class="campus-tour-heading">
          <span class="section-kicker"><i></i> CAMPUS TOUR</span>
          <h3>八里台主题游览路线</h3>
          <p>选择一条主题路线后，系统会逐段规划真实步行道路并在地图上绘制；站点编号仅表示建议游览顺序。</p>
        </div>
        <div class="campus-tour-grid">
          <article v-for="tour in campusToursForCurrentCampus" :key="tour.id" :class="{ active: activeTourId === tour.id }">
            <h4>{{ tour.name }}</h4>
            <p>{{ tour.summary }}</p>
            <button type="button" :disabled="tourPlanning" @click="showCampusTour(tour)">
              {{ tourPlanning && activeTourId === tour.id ? '正在按道路规划…' : activeTourId === tour.id ? '已在地图显示' : '按道路规划' }}
            </button>
          </article>
        </div>
        <div v-if="activeTour" class="campus-tour-actions">
          <button type="button" :disabled="tourPlanning" @click="clearCampusTour">关闭当前路线</button>
        </div>
        <ol v-if="activeTourStops.length" class="campus-tour-stops">
          <li v-for="(location, index) in activeTourStops" :key="location.id">
            <button type="button" @click="selectAndFocus(location, true)"><b>{{ index + 1 }}</b>{{ location.name }}</button>
          </li>
        </ol>
      </section>
    </section>

    <section v-if="selectedLocation" class="selected-location-card" aria-live="polite">
      <div :class="`selected-location-number category-${selectedLocation.category}`">
        <small>{{ selectedLocation.number }}</small>
        <span aria-hidden="true">{{ categoryMeta[selectedLocation.category].symbol }}</span>
      </div>
      <div>
        <span>{{ categoryMeta[selectedLocation.category].label }} · {{ currentCampus.name }}</span>
        <h2>{{ selectedLocation.name }}</h2>
        <p>{{ selectedLocation.description }}</p>
        <small v-if="baseMode === 'online' && !selectedLocation.geoPoint">该地点目前仅提供校园导览图坐标。</small>
      </div>
      <button type="button" @click="selectAndFocus(selectedLocation, true)">在地图中定位</button>
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
            @click="openPhoto(photo)"
          >
            <img :src="photo.src" :alt="photo.alt" loading="lazy" decoding="async" />
            <span>{{ photo.caption }}</span>
          </button>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <dialog
        ref="photoDialog"
        class="location-photo-dialog"
        aria-label="地点实景大图"
        @click.self="closePhoto"
        @close="activePhoto = null"
      >
        <button type="button" class="location-photo-close" aria-label="关闭实景照片" @click="closePhoto">×</button>
        <figure v-if="activePhoto">
          <img :src="activePhoto.src" :alt="activePhoto.alt" />
          <figcaption>{{ activePhoto.caption }}</figcaption>
        </figure>
      </dialog>
    </Teleport>

    <section class="map-directory" aria-labelledby="directory-title">
      <div class="section-heading compact">
        <span class="section-kicker"><i></i> LOCATION INDEX</span>
        <h2 id="directory-title">{{ currentCampus.short }}地点索引</h2>
      </div>
      <div class="map-directory-grid">
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

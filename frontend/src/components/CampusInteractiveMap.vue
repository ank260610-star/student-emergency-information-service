<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import { categoryMeta, onlineMapProvider } from '../data/campusLocations'
import {
  clampPointToViewportEdge,
  imagePointToSimpleLatLng,
  markerPresentationForLocation,
} from '../utils/mapUtils'

const props = defineProps({
  campus: { type: Object, required: true },
  locations: { type: Array, required: true },
  baseMode: { type: String, required: true },
  selectedId: { type: String, default: '' },
  forceAllMarkers: { type: Boolean, default: false },
  forcedIds: { type: Array, default: () => [] },
})

const emit = defineEmits(['select', 'clear-selection', 'status', 'coordinate-unavailable'])

const mapElement = ref(null)
const loading = ref(true)
const mapError = ref('')
const tileError = ref(false)
const hospitalDirection = ref(null)

let map = null
let baseLayer = null
let featureLayer = null
let campusBounds = null
let userLayer = null
let resizeObserver = null
let initialZoom = 0
let loadingTimer = 0
const featureById = new Map()

const geocodedCount = computed(() => props.locations.filter((location) => location.geoPoint).length)
const emergencyLocation = computed(() => props.locations.find((location) => location.emergency))
const forcedIdSet = computed(() => new Set(props.forcedIds))
const hospitalUnavailableOnline = computed(() => (
  props.baseMode === 'online' && emergencyLocation.value && !emergencyLocation.value.geoPoint
))
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function locationLatLng(location) {
  if (props.baseMode === 'online') {
    return location.geoPoint ? L.latLng(location.geoPoint[0], location.geoPoint[1]) : null
  }

  const point = imagePointToSimpleLatLng(location.imagePoint, props.campus.imageSize)
  return point ? L.latLng(point[0], point[1]) : null
}

function popupElement(location) {
  const article = document.createElement('article')
  article.className = 'campus-popup-card'

  const eyebrow = document.createElement('span')
  eyebrow.className = 'campus-popup-eyebrow'
  eyebrow.textContent = `${location.number} · ${categoryMeta[location.category]?.label || '校园地点'}`

  const title = document.createElement('strong')
  title.textContent = location.name

  const description = document.createElement('p')
  description.textContent = location.description || `${props.campus.name}校园地点`

  const campusName = document.createElement('small')
  campusName.textContent = props.campus.name

  article.append(eyebrow, title, description, campusName)
  return article
}

function markerIcon(location, active, presentation) {
  const category = escapeHtml(location.category)
  const number = escapeHtml(location.number)
  const stateClass = active ? ' is-active' : ''

  if (presentation === 'hospital') {
    const name = escapeHtml(location.name)
    return L.divIcon({
      className: `campus-hospital-icon${stateClass}`,
      html: `<span class="hospital-icon-cross" aria-hidden="true">+</span><span class="hospital-icon-copy"><b>${name}</b><small>${number} · 医疗与应急</small></span>`,
      iconSize: [174, 48],
      iconAnchor: [23, 24],
      popupAnchor: [0, -26],
    })
  }

  if (presentation === 'dot') {
    return L.divIcon({
      className: `campus-dot-icon category-${category}${stateClass}`,
      html: '<span aria-hidden="true"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -12],
    })
  }

  return L.divIcon({
    className: `campus-number-icon category-${category}${stateClass}`,
    html: `<span aria-hidden="true">${number}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  })
}

function clearFeatures() {
  featureById.clear()
  if (featureLayer && map) map.removeLayer(featureLayer)
  featureLayer = null
}

function createFeature(location, latLng, presentation) {
  const active = props.selectedId === location.id
  let feature

  if (presentation === 'hospital') {
    feature = L.marker(latLng, {
      icon: markerIcon(location, active, presentation),
      keyboard: true,
      title: `${location.name}（医疗与应急）`,
      alt: `${location.number}，${location.name}，医疗与应急`,
      riseOnHover: true,
      zIndexOffset: 1500,
    })
  } else {
    feature = L.marker(latLng, {
      icon: markerIcon(location, active, presentation),
      keyboard: true,
      title: location.name,
      alt: `${location.number}，${location.name}`,
      riseOnHover: true,
    })
  }

  feature.bindTooltip(location.name, { direction: 'top', offset: [0, -12] })
  feature.bindPopup(popupElement(location), { minWidth: 210, maxWidth: 280 })
  feature.on('click', (event) => {
    if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent)
    emit('select', location.id)
  })
  feature.addTo(featureLayer)
  const featureElement = feature.getElement?.()
  if (featureElement && feature instanceof L.Marker) {
    featureElement.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      event.stopPropagation()
      emit('select', location.id)
      feature.openPopup()
    })
  }
  featureById.set(location.id, feature)
}

function refreshFeatures() {
  if (!map) return
  clearFeatures()
  featureLayer = L.layerGroup().addTo(map)

  const currentZoom = map.getZoom()
  for (const location of props.locations) {
    const latLng = locationLatLng(location)
    if (!latLng) continue
    const presentation = markerPresentationForLocation(location, currentZoom, initialZoom, {
      selected: props.selectedId === location.id,
      forced: props.forceAllMarkers || forcedIdSet.value.has(location.id),
    })
    createFeature(location, latLng, presentation)
  }

  const selectedFeature = featureById.get(props.selectedId)
  if (selectedFeature) {
    requestAnimationFrame(() => {
      if (featureById.get(props.selectedId) === selectedFeature) selectedFeature.openPopup()
    })
  }

  updateHospitalDirection()
}

function handleMapMotion() {
  updateHospitalDirection()
}

function handleMapBackgroundClick() {
  if (!props.selectedId) return
  map?.closePopup()
  emit('clear-selection')
}

function updateHospitalDirection() {
  if (!map || hospitalUnavailableOnline.value) {
    hospitalDirection.value = null
    return
  }
  const location = emergencyLocation.value
  const latLng = location && locationLatLng(location)
  const width = mapElement.value?.clientWidth || 0
  const height = mapElement.value?.clientHeight || 0
  if (!latLng || !width || !height) {
    hospitalDirection.value = null
    return
  }
  const projected = map.latLngToContainerPoint(latLng)
  hospitalDirection.value = clampPointToViewportEdge(projected, width, height, 54)
}

function focusHospital() {
  if (emergencyLocation.value) focusLocation(emergencyLocation.value.id, true)
}

function illustrationMap() {
  const { width, height } = props.campus.imageSize
  campusBounds = L.latLngBounds([0, 0], [height, width])
  map = L.map(mapElement.value, {
    crs: L.CRS.Simple,
    zoomControl: true,
    attributionControl: false,
    keyboard: true,
    minZoom: -4,
    maxZoom: 3,
    zoomSnap: 0.25,
    wheelPxPerZoomLevel: 80,
  })

  map.zoomControl.setPosition('topright')
  baseLayer = L.imageOverlay(props.campus.image, campusBounds, {
    alt: props.campus.imageAlt,
    className: 'campus-plan-overlay',
  })
    .on('load', () => { loading.value = false })
    .on('error', () => {
      loading.value = false
      mapError.value = '校园导览图加载失败，请稍后重试。'
    })
    .addTo(map)

  map.fitBounds(campusBounds, { padding: [8, 8], animate: false })
  initialZoom = map.getZoom()
  map.setMinZoom(initialZoom - 0.75)
  map.setMaxBounds(campusBounds.pad(0.18))
}

function onlineMap() {
  campusBounds = L.latLngBounds(props.campus.geoBounds)
  map = L.map(mapElement.value, {
    zoomControl: true,
    attributionControl: true,
    keyboard: true,
    minZoom: 3,
    maxZoom: onlineMapProvider.maxZoom,
  })
  map.zoomControl.setPosition('topright')
  map.attributionControl.setPrefix(false)

  let tileFailures = 0
  baseLayer = L.tileLayer(onlineMapProvider.url, {
    attribution: onlineMapProvider.attribution,
    maxZoom: onlineMapProvider.maxZoom,
  })
    .on('load', () => { loading.value = false })
    .on('tileerror', () => {
      tileFailures += 1
      if (tileFailures >= 3) {
        loading.value = false
        tileError.value = true
      }
    })
    .addTo(map)

  L.rectangle(campusBounds, {
    color: '#7e0c6e',
    weight: 2,
    fillColor: '#7e0c6e',
    fillOpacity: 0.06,
    interactive: false,
  }).addTo(map)

  map.fitBounds(campusBounds, { padding: [24, 24], animate: false })
  initialZoom = map.getZoom()
  loadingTimer = window.setTimeout(() => {
    if (!loading.value) return
    loading.value = false
    tileError.value = true
  }, 8000)
}

function destroyMap() {
  if (loadingTimer) window.clearTimeout(loadingTimer)
  loadingTimer = 0
  hospitalDirection.value = null
  featureById.clear()
  featureLayer = null
  baseLayer = null
  userLayer = null
  campusBounds = null
  if (map) {
    map.stopLocate()
    map.off()
    map.remove()
    map = null
  }
}

async function buildMap() {
  destroyMap()
  await nextTick()
  if (!mapElement.value) return

  loading.value = true
  mapError.value = ''
  tileError.value = false

  if (props.baseMode === 'online') onlineMap()
  else illustrationMap()

  map.on('move zoom resize', handleMapMotion)
  map.on('zoomend', refreshFeatures)
  map.on('click', handleMapBackgroundClick)
  refreshFeatures()
  map.invalidateSize({ animate: false })
}

function resetView() {
  if (!map || !campusBounds) return
  map.fitBounds(campusBounds, {
    padding: props.baseMode === 'online' ? [24, 24] : [8, 8],
    animate: false,
  })
  emit('status', '已恢复全图。')
}

function focusLocation(locationId, openPopup = true) {
  const location = props.locations.find((item) => item.id === locationId)
  if (!location || !map) return false
  const latLng = locationLatLng(location)
  if (!latLng) {
    emit('coordinate-unavailable', location)
    return false
  }

  const targetZoom = props.baseMode === 'online'
    ? Math.max(map.getZoom(), 17)
    : Math.max(map.getZoom(), initialZoom + 2.6)
  map.setView(latLng, targetZoom, { animate: false })
  const feature = featureById.get(location.id)
  if (openPopup && feature) feature.openPopup()
  return true
}

function locationErrorMessage(error) {
  if (error.code === 1) return '定位权限被拒绝；你仍可手动拖动地图。'
  if (error.code === 3) return '定位请求超时，请检查系统定位设置后重试。'
  return '暂时无法获取当前位置，请稍后重试。'
}

function locateUser() {
  if (props.baseMode !== 'online') {
    emit('status', '请先切换到在线地图再使用定位。')
    return
  }
  if (!navigator.geolocation) {
    emit('status', '当前浏览器不支持定位功能。')
    return
  }

  emit('status', '正在请求浏览器定位…')
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      if (!map) return
      if (userLayer) map.removeLayer(userLayer)
      const point = L.latLng(coords.latitude, coords.longitude)
      userLayer = L.circleMarker(point, {
        radius: 8,
        weight: 3,
        color: '#fff',
        fillColor: '#1769aa',
        fillOpacity: 1,
      }).bindTooltip('你的位置').addTo(map)
      map.setView(point, Math.max(map.getZoom(), 17), { animate: false })
      emit('status', '已显示当前位置；位置不会上传或保存。')
    },
    (error) => emit('status', locationErrorMessage(error)),
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
  )
}

watch(
  () => [props.campus.id, props.baseMode],
  () => buildMap(),
)

watch(
  () => [props.selectedId, props.forceAllMarkers, props.forcedIds, props.locations],
  () => refreshFeatures(),
  { deep: true },
)

onMounted(() => {
  resizeObserver = new ResizeObserver(() => {
    if (!mapElement.value) return
    if (map) map.invalidateSize({ animate: false })
  })
  resizeObserver.observe(mapElement.value)
  buildMap()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  destroyMap()
})

defineExpose({ focusLocation, locateUser, resetView })
</script>

<template>
  <div class="campus-interactive-map" :class="[`campus-${campus.id}`, `base-${baseMode}`]">
    <div
      ref="mapElement"
      class="leaflet-campus-map"
      :aria-label="`${campus.name}${baseMode === 'online' ? '在线地图' : '校园导览图'}`"
    ></div>
    <div v-if="baseMode === 'illustration'" class="campus-map-finish" aria-hidden="true"></div>

    <div v-if="loading" class="map-state-overlay" role="status">
      <span class="map-loading-spinner" aria-hidden="true"></span>
      正在加载{{ baseMode === 'online' ? '在线底图' : '校园导览图' }}…
    </div>
    <div v-else-if="mapError" class="map-state-overlay is-error" role="alert">{{ mapError }}</div>

    <div v-if="tileError" class="map-tile-warning" role="alert">
      在线底图部分加载失败。你可以继续使用标记，或切回“校园导览图”。
    </div>
    <div v-if="baseMode === 'online' && geocodedCount === 0 && !tileError" class="map-data-warning" role="status">
      {{ campus.geoDataStatus }}
    </div>

    <button
      v-if="hospitalDirection"
      type="button"
      class="hospital-edge-indicator"
      :style="{ left: `${hospitalDirection.x}px`, top: `${hospitalDirection.y}px` }"
      :aria-label="`校医院在当前视野外，点击定位到${emergencyLocation?.name}`"
      @click="focusHospital"
    >
      <span class="hospital-edge-arrow" :style="{ transform: `rotate(${hospitalDirection.angle}deg)` }">➜</span>
      <b>校医院</b>
    </button>

    <button
      v-if="hospitalUnavailableOnline"
      type="button"
      class="hospital-unmapped-badge"
      @click="emit('coordinate-unavailable', emergencyLocation)"
    >
      <span aria-hidden="true">+</span>
      <b>校医院</b>
      <small>导览图有核验位置</small>
    </button>

  </div>
</template>

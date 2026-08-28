<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import CampusInteractiveMap from '../components/CampusInteractiveMap.vue'
import CampusMapControls from '../components/CampusMapControls.vue'
import {
  campusConfigs,
  categoryMeta,
  getCampusLocations,
} from '../data/campusLocations'

const campus = ref('balitai')
const baseMode = ref('illustration')
const category = ref('all')
const query = ref('')
const selectedId = ref('')
const mapStatus = ref('八里台 · 90 个地点')
const interactiveMap = ref(null)
const mapWorkspace = ref(null)

const currentCampus = computed(() => campusConfigs[campus.value])
const campusLocations = computed(() => getCampusLocations(campus.value))
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
const forcedMarkerIds = computed(() => (
  category.value !== 'all' || normalizedQuery.value
    ? filteredLocations.value.map((location) => location.id)
    : []
))
const selectedLocation = computed(() => campusLocations.value.find((location) => location.id === selectedId.value))
const searchResults = computed(() => normalizedQuery.value ? filteredLocations.value.slice(0, 8) : [])
const geocodedCount = computed(() => campusLocations.value.filter((location) => location.geoPoint).length)

function handleMapSelection(locationId) {
  selectedId.value = locationId
  const location = campusLocations.value.find((item) => item.id === locationId)
  if (location) mapStatus.value = `已选择：${location.name}`
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
  mapStatus.value = `${location.name}尚无经过核验的经纬度，请切换到“校园导览图”查看准确图上位置。`
}

function setBaseMode(mode) {
  baseMode.value = mode
  mapStatus.value = mode === 'online'
    ? '已切换到在线地图。'
    : '已切换到校园导览图。'
}

watch(campus, () => {
  selectedId.value = ''
  query.value = ''
  category.value = 'all'
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
          @select="handleMapSelection"
          @clear-selection="clearMapSelection"
          @status="mapStatus = $event"
          @coordinate-unavailable="handleCoordinateUnavailable"
        />
        <CampusMapControls
          :base-mode="baseMode"
          :category="category"
          :location-status="mapStatus"
          @update:base-mode="setBaseMode"
          @update:category="category = $event"
          @reset="interactiveMap?.resetView()"
          @locate="interactiveMap?.locateUser()"
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
    </section>

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

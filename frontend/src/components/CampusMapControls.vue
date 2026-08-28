<script setup>
import { ref } from 'vue'
import { categoryMeta } from '../data/campusLocations'

defineProps({
  baseMode: { type: String, required: true },
  category: { type: String, required: true },
  locationStatus: { type: String, default: '' },
})

const emit = defineEmits([
  'update:baseMode',
  'update:category',
  'reset',
  'locate',
])

const collapsed = ref(false)
</script>

<template>
  <aside class="map-controls" :class="{ collapsed }" aria-label="地图显示控制">
    <div class="map-controls-heading">
      <strong>地图显示</strong>
      <button
        type="button"
        class="map-controls-toggle"
        :aria-expanded="!collapsed"
        @click="collapsed = !collapsed"
      >
        {{ collapsed ? '展开' : '收起' }}
      </button>
    </div>

    <div v-show="!collapsed" class="map-controls-body">
      <fieldset>
        <legend>底图</legend>
        <div class="map-segmented">
          <button
            type="button"
            :aria-pressed="baseMode === 'illustration'"
            :class="{ active: baseMode === 'illustration' }"
            @click="emit('update:baseMode', 'illustration')"
          >校园导览图</button>
          <button
            type="button"
            :aria-pressed="baseMode === 'online'"
            :class="{ active: baseMode === 'online' }"
            @click="emit('update:baseMode', 'online')"
          >在线地图</button>
        </div>
      </fieldset>

      <label class="map-category-filter">
        <span>地点分类</span>
        <select :value="category" @change="emit('update:category', $event.target.value)">
          <option value="all">全部分类</option>
          <option v-for="(meta, key) in categoryMeta" :key="key" :value="key">
            {{ meta.label }}
          </option>
        </select>
      </label>

      <div class="map-control-actions">
        <button type="button" @click="emit('reset')">恢复全图</button>
        <button v-if="baseMode === 'online'" type="button" @click="emit('locate')">定位我</button>
      </div>

      <ul class="map-legend" aria-label="地点分类图例">
        <li v-for="(meta, key) in categoryMeta" :key="key">
          <span :class="`legend-symbol category-${key}`" aria-hidden="true">{{ meta.symbol }}</span>
          {{ meta.label }}
        </li>
      </ul>
      <p v-if="locationStatus" class="map-location-status" role="status">{{ locationStatus }}</p>
    </div>
  </aside>
</template>

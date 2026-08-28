<script setup>
import { computed, ref } from 'vue'
const campus = ref('balitai')
const campusData = {
  balitai: {
    name: '八里台校区', short: '八里台', image: '/images/campus-map-balitai.jpg', alt: '南开大学八里台校区地图，标有报到关键地点',
    markers: [
      { id: 'hospital', label: '校医院', x: 59.8, y: 36.4, type: 'hospital' },
      { id: 'gate', label: '东门', x: 95, y: 43, type: 'gate' },
      { id: 'service', label: '服务楼', x: 76.1, y: 54.6, type: 'service' },
      { id: 'dorm', label: '宿舍区', x: 38, y: 26, type: 'dorm' },
      { id: 'canteen', label: '一/三食堂', x: 49.2, y: 39.2, type: 'canteen' },
      { id: 'welcome', label: '集中咨询点', x: 66, y: 48, type: 'welcome' },
    ],
  },
  jinnan: {
    name: '津南校区', short: '津南', image: '/images/campus-map-jinnan.jpg', alt: '南开大学津南校区地图，标有报到关键地点',
    markers: [
      { id: 'hospital', label: '校医院', x: 33.6, y: 18.4, type: 'hospital' },
      { id: 'gate', label: '东门', x: 96, y: 58.5, type: 'gate' },
      { id: 'service', label: '业务西楼', x: 50.5, y: 77, type: 'service' },
      { id: 'dorm', label: '宿舍区', x: 29, y: 34, type: 'dorm' },
      { id: 'canteen', label: '食堂', x: 38.5, y: 58.5, type: 'canteen' },
      { id: 'welcome-humanities', label: '文科咨询点', x: 38, y: 43, type: 'welcome' },
      { id: 'welcome-science', label: '理科咨询点', x: 34, y: 84, type: 'welcome' },
    ],
  },
}
const current = computed(() => campusData[campus.value])
const locations = computed(() => campus.value === 'jinnan'
  ? [['◎', '迎新咨询', '文科组团 / 理科组团', '文科三学院之间；理科 5B、5C 楼前'], ['✚', '医疗资源', '津南校区校医院', '急诊室 85358311'], ['卡', '校园卡 / 网络', '综合业务西楼', '师生服务大厅'], ['餐', '用餐区域', '第一、第二及清真食堂', '以现场开放公告为准']]
  : [['◎', '迎新咨询', '书画艺术与美学研究中心草坪前', '2026 集中服务咨询点'], ['✚', '医疗资源', '八里台校区校医院', '急诊室 23502400'], ['卡', '校园卡 / 网络', '服务楼 103 / 104', '网络服务 / 校园卡服务'], ['餐', '用餐区域', '第一、第二、第三及清真食堂', '以现场开放公告为准']])
</script>

<template>
  <div class="page inner-page map-page">
    <header class="page-header"><span class="section-kicker"><i></i> CAMPUS MAP</span><h1>校园地图</h1><p>快速确认所在校区、常用建筑与集合位置，为报告与人员引导提供参考。</p></header>
    <section class="campus-switcher" aria-labelledby="campus-title"><div class="section-heading compact"><span class="section-kicker"><i></i> 选择校区</span><h2 id="campus-title">你现在在哪个校区？</h2></div><div class="campus-tabs" role="tablist" aria-label="校区切换"><button v-for="(data, key) in campusData" :key="key" role="tab" :aria-selected="campus === key" :class="{ active: campus === key }" @click="campus = key">{{ data.name }}</button></div></section>
    <figure class="campus-map-figure">
      <a class="map-image-link" :href="current.image" target="_blank" rel="noopener" :aria-label="`在新标签页查看${current.name}地图原图`">
        <span class="map-image-stage">
          <img :src="current.image" :alt="current.alt" />
          <span v-for="marker in current.markers" :key="marker.id" class="guide-map-marker" :class="marker.type" :style="{ left: `${marker.x}%`, top: `${marker.y}%` }" aria-hidden="true"><span class="guide-map-dot">{{ marker.type === 'hospital' ? '✚' : '' }}</span><strong>{{ marker.label }}</strong></span>
        </span>
      </a>
      <figcaption><span>!</span><strong>{{ current.name }}</strong>：点击地图可查看原图。迎新区域为方向参考，具体学院摊位以南开飞书和现场标识为准。</figcaption>
    </figure>
    <section class="location-section" aria-labelledby="location-title"><div class="section-heading compact"><span class="section-kicker"><i></i> 常用位置</span><h2 id="location-title">{{ current.short }}常用位置清单</h2></div><div class="location-grid"><article v-for="item in locations" :key="item[1]"><span class="location-icon" aria-hidden="true">{{ item[0] }}</span><div><small>{{ item[1] }}</small><strong>{{ item[2] }}</strong><p>{{ item[3] }}</p></div></article></div></section>
    <aside class="map-future-note"><strong>地图使用提示</strong><p>地图用于快速识别校区建筑与方位；遇到紧急情况时，请结合现场标识并听从老师与专业人员指引。</p></aside>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
const campus = ref('balitai')
const campusData = {
  balitai: { name: '八里台校区', short: '八里台', image: '/images/campus-map-balitai.jpg', alt: '南开大学八里台校区地图，校医院已使用红十字标识', hospital: { x: 59.8, y: 36.4 }, zones: ['宿舍区', '教学楼', '学生生活中心'] },
  jinnan: { name: '津南校区', short: '津南', image: '/images/campus-map-jinnan.jpg', alt: '南开大学津南校区地图，校医院已使用红十字标识', hospital: { x: 33.6, y: 18.4 }, zones: ['宿舍区', '公共教学楼', '学生生活中心'] },
}
const current = computed(() => campusData[campus.value])
const locations = computed(() => [['✚', '医疗资源', `${current.value.name}校医院`, '请查看地图红十字标识'], ['◈', '安全服务', `${current.value.name}保卫值班点`, '请结合校园标识确认'], ['◎', '集合区域', '临时集合点', '由现场老师确认'], ['▦', '高频区域', current.value.zones.join('、'), '位置仅作分类参考']])
</script>

<template>
  <div class="page inner-page map-page">
    <header class="page-header"><span class="section-kicker"><i></i> CAMPUS MAP</span><h1>校园地图</h1><p>快速确认所在校区、常用建筑与集合位置，为报告与人员引导提供参考。</p></header>
    <section class="campus-switcher" aria-labelledby="campus-title"><div class="section-heading compact"><span class="section-kicker"><i></i> 选择校区</span><h2 id="campus-title">你现在在哪个校区？</h2></div><div class="campus-tabs" role="group" aria-label="校区切换"><button v-for="(data, key) in campusData" :key="key" type="button" :aria-pressed="campus === key" :class="{ active: campus === key }" @click="campus = key">{{ data.name }}</button></div></section>
    <figure class="campus-map-figure">
      <a class="map-image-link" :href="current.image" target="_blank" rel="noopener" :aria-label="`在新标签页查看${current.name}地图原图`">
        <span class="map-image-stage">
          <img :src="current.image" :alt="current.alt" loading="lazy" decoding="async" />
          <span class="hospital-marker" :style="{ left: `${current.hospital.x}%`, top: `${current.hospital.y}%` }" aria-hidden="true"><span class="hospital-cross"></span><strong>校医院</strong></span>
        </span>
      </a>
      <figcaption><span>!</span><strong>{{ current.name }}</strong>：点击地图可查看原图。具体集合点与疏散路线以现场老师和学校官方通知为准。</figcaption>
    </figure>
    <section class="location-section" aria-labelledby="location-title"><div class="section-heading compact"><span class="section-kicker"><i></i> 常用位置</span><h2 id="location-title">{{ current.short }}常用位置清单</h2></div><div class="location-grid"><article v-for="item in locations" :key="item[1]"><span class="location-icon" aria-hidden="true">{{ item[0] }}</span><div><small>{{ item[1] }}</small><strong>{{ item[2] }}</strong><p>{{ item[3] }}</p></div></article></div></section>
    <aside class="map-future-note"><strong>地图使用提示</strong><p>地图用于快速识别校区建筑与方位；遇到紧急情况时，请结合现场标识并听从老师与专业人员指引。</p></aside>
  </div>
</template>

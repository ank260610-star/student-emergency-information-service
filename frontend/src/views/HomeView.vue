<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { campusConfigs, getCampusLocations } from '../data/campusLocations'
import {
  NK_ZHIXING_MESSAGE_LIMIT,
  saveNkZhixingHandoff,
} from '../services/nkZhixingAgent'

const router = useRouter()
const campus = ref('balitai')
const message = ref('')
const handoffError = ref('')

const selectedCampus = computed(() => campusConfigs[campus.value])
const suggestions = computed(() => [
  `从${selectedCampus.value.short}西南门去图书馆怎么走？`,
  `我在${selectedCampus.value.short}，附近哪里可以吃饭？`,
  `怎么去${selectedCampus.value.short}校医院？`,
])
const previewNames = {
  balitai: ['新图书馆', '校医院', '学生活动中心'],
  jinnan: ['中心图书馆', '南开大学医院', '大通学生活动中心'],
}
const previewLocations = computed(() => {
  const names = previewNames[campus.value]
  return getCampusLocations(campus.value).filter((location) => names.includes(location.name))
})

const tasks = [
  { symbol: '行', title: '找地点与路线', detail: '查看校区地图、建筑实景与步行建议', to: '/campus-map' },
  { symbol: '办', title: '校园办事', detail: '查询窗口、报修、缴费与网络服务', to: '/service-guide' },
  { symbol: '联', title: '紧急联络', detail: '快速找到医疗、安全与宿舍服务电话', to: '/contacts' },
  { symbol: '近', title: '周边交通与服务', detail: '了解校外交通、医院与生活设施', to: '/nearby' },
]

function chooseSuggestion(suggestion) {
  message.value = suggestion
  handoffError.value = ''
}

function askNkZhixing() {
  const normalizedMessage = message.value.trim()
  if (!normalizedMessage) return
  const saved = saveNkZhixingHandoff({ campus: campus.value, message: normalizedMessage })
  if (!saved) {
    handoffError.value = '浏览器暂时无法传递问题，请直接进入地图使用 NK 智行。'
    return
  }
  router.push('/campus-map')
}
</script>

<template>
  <div class="page home-page daily-home">
    <section class="zhixing-hero" aria-labelledby="home-title">
      <div class="zhixing-hero-copy">
        <span class="section-kicker"><i></i> NK-GENIOS CAMPUS GUIDE</span>
        <h1 id="home-title">问路、找地点、办事情，<br /><em>先问 NK 智行。</em></h1>
        <p>选择校区，说出你现在的位置、目的地或遇到的问题，NK 智行会带你进入校园地图继续查找。</p>

        <form class="home-agent-form" @submit.prevent="askNkZhixing">
          <fieldset>
            <legend>选择校区</legend>
            <div class="home-campus-tabs">
              <button
                v-for="(data, key) in campusConfigs"
                :key="key"
                type="button"
                :class="{ active: campus === key }"
                :aria-pressed="campus === key"
                @click="campus = key"
              >{{ data.name }}</button>
            </div>
          </fieldset>
          <label for="home-agent-input">你想去哪里，或遇到了什么问题？</label>
          <textarea
            id="home-agent-input"
            v-model="message"
            :maxlength="NK_ZHIXING_MESSAGE_LIMIT"
            placeholder="例如：我从西南门出发，怎么去中心图书馆？"
          ></textarea>
          <div class="home-agent-submit">
            <small>请勿输入身份证号、手机号、病历等敏感信息。</small>
            <button type="submit" :disabled="!message.trim()">进入地图并提问 <span aria-hidden="true">→</span></button>
          </div>
          <p v-if="handoffError" class="home-agent-error" role="alert">{{ handoffError }}</p>
        </form>

        <div class="home-agent-suggestions" aria-label="常见问题">
          <span>试着问</span>
          <button v-for="suggestion in suggestions" :key="suggestion" type="button" @click="chooseSuggestion(suggestion)">
            {{ suggestion }}
          </button>
        </div>
      </div>

      <div class="home-map-preview">
        <div class="home-map-toolbar">
          <span><i aria-hidden="true"></i>{{ selectedCampus.name }}</span>
          <RouterLink :to="{ path: '/campus-map', query: { campus } }">打开完整地图 →</RouterLink>
        </div>
        <div class="home-map-stage">
          <img :src="selectedCampus.image" :alt="`${selectedCampus.name}校园地图预览`" />
          <span
            v-for="location in previewLocations.filter((location) => location.imagePoint)"
            :key="location.id"
            class="home-map-point"
            :class="{ emergency: location.emergency }"
            :style="{ left: `${location.imagePoint.x}%`, top: `${location.imagePoint.y}%` }"
          ><i aria-hidden="true"></i><b>{{ location.name }}</b></span>
        </div>
        <p><span aria-hidden="true">◎</span> 地图包含建筑检索、实景照片、当前位置与 NK 智行路线建议。</p>
      </div>
    </section>

    <section class="home-task-section" aria-labelledby="task-title">
      <div class="section-heading">
        <span class="section-kicker"><i></i> CAMPUS SERVICES</span>
        <h2 id="task-title">今天要处理什么？</h2>
      </div>
      <div class="home-task-grid">
        <RouterLink v-for="task in tasks" :key="task.title" :to="task.to" class="home-task-card">
          <span aria-hidden="true">{{ task.symbol }}</span>
          <strong>{{ task.title }}</strong>
          <p>{{ task.detail }}</p>
          <b aria-hidden="true">→</b>
        </RouterLink>
        <article class="home-task-card official-task-card">
          <span aria-hidden="true">官</span>
          <strong>官方服务入口</strong>
          <p>集中查找学校网站、办事平台与官方公众号</p>
          <div><RouterLink to="/links">常用链接</RouterLink><RouterLink to="/wechat">常用公众号</RouterLink></div>
        </article>
      </div>
    </section>

    <section class="home-emergency" aria-labelledby="emergency-title">
      <div class="home-emergency-heading">
        <span aria-hidden="true">!</span>
        <div><small>紧急情况</small><h2 id="emergency-title">先确保安全，再联系专业力量</h2></div>
      </div>
      <div class="home-emergency-actions">
        <a href="tel:110"><small>公安报警</small><strong>110</strong></a>
        <a href="tel:120"><small>医疗急救</small><strong>120</strong></a>
        <RouterLink to="/contacts"><small>校内资源</small><strong>查看联络目录 →</strong></RouterLink>
      </div>
    </section>

    <aside class="home-fraud-note">
      <span aria-hidden="true">盾</span>
      <p><strong>校园服务先核验身份与官方渠道。</strong>不要因“限时办理”“统一收费”提供验证码或当场转账；拿不准时先联系辅导员或保卫处。</p>
      <RouterLink to="/contacts">查看求助方式 →</RouterLink>
    </aside>
  </div>
</template>

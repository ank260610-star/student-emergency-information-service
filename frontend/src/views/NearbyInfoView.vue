<script setup>
import { computed, ref } from 'vue'

const campus = ref('jinnan')

const campusData = {
  jinnan: {
    name: '津南校区',
    address: '天津海河教育园区同砚路 38 号',
    summary: '校区面积较大，地铁优先选择 6 号线；公交、网约车与校际通勤通常从西门一带衔接。',
    transport: [
      { icon: '地', type: '轨道交通', title: '地铁 6 号线｜南开大学津南校区站', description: '车站位于校区同砚路一侧，靠近西南门。携带大件行李时，出站后先确认宿舍组团方向再进校。', note: '出行前在天津地铁 App 核对首末班车与运营调整。', map: '南开大学津南校区地铁站' },
      { icon: '公', type: '公交站点', title: '南开大学新校西门站', description: '612 路、612 快线及部分校际、市政公交经由西门片区；613 等线路是否停靠应以当天站牌和实时公交为准。', note: '不要只依据往年攻略中的线路和发车时间。', map: '南开大学新校西门公交站' },
      { icon: '校', type: '校际通勤', title: '津南西门外公交站', description: '学校通勤车辆往返津南与八里台；津南端主要在西门外发车，部分点对点班次经梨树园、一食堂。', note: '工作日、非工作日及寒暑假方案不同。', source: 'https://nkjd.nankai.edu.cn/cwfw/tqbc.htm' },
    ],
    services: [
      { icon: '医', type: '校内医疗', title: '南开大学津南校区校医院', address: '校内西北侧，文科宿舍区附近', phone: '急诊室 022-85358311', description: '校内常见病就诊和综合急诊的首选位置。危及生命时直接拨打 120。', map: '南开大学津南校区校医院' },
      { icon: '院', type: '三级甲等医院', title: '天津市海河医院', address: '津南区双港镇津沽路 890 号', phone: '022-58830026', description: '大型公立综合医院，距离校园有一定车程；急症请由 120 判断送医地点。', map: '天津市海河医院' },
      { icon: '警', type: '公安机关', title: '天津市公安局津南分局', address: '津南区咸水沽镇二八公路 55 号', phone: '报警请拨 110', description: '区级公安机关。遭遇诈骗、盗窃、威胁或人身危险时，不必自行前往，立即拨打 110。', map: '天津市公安局津南分局' },
      { icon: '服', type: '公共服务', title: '海棠街道办事处', address: '津南区同砚路 50 号', phone: '具体业务先电话核实', description: '海河教育园区属地公共服务机构；户籍相关服务点另位于同砚路 28 号。', map: '天津市津南区海棠街道办事处' },
    ],
  },
  balitai: {
    name: '八里台校区',
    address: '天津市南开区卫津路 94 号',
    summary: '位于中心城区，地铁和公交选择较多；说目的地时需区分东门、西门、复康路及西南村生活区。',
    transport: [
      { icon: '地', type: '轨道交通', title: '地铁 7、11 号线｜南开大学八里台站', description: '两线可在站内换乘，是前往八里台校区最直接的地铁站之一。出站后按东门方向和现场导向步行。', note: '7 号线南段已于 2025 年开通，站内可换乘 11 号线。', map: '南开大学八里台地铁站' },
      { icon: '公', type: '公交站点', title: '八里台、七里台、复康路八里台', description: '校区周边站点分布在卫津路、复康路等不同道路，步行方向差别明显；选择线路时同时核对下车站名和校门。', note: '公交线路较多且可能调整，请使用实时地图规划。', map: '八里台公交站' },
      { icon: '校', type: '校际通勤', title: '八里台西门公交站', description: '学校通勤车辆由八里台西门一带往返津南校区，工作日有点对点及快速线路。', note: '师生出发前应查看学校最新通勤时刻表。', source: 'https://nkjd.nankai.edu.cn/cwfw/tqbc.htm' },
    ],
    services: [
      { icon: '医', type: '校内医疗', title: '南开大学八里台校区校医院', address: '校内编号 42，体育馆及宿舍区附近', phone: '急诊室 022-23502400', description: '校内常见病就诊与急诊位置，校园地图已有红十字标记。', map: '南开大学八里台校区校医院' },
      { icon: '院', type: '三级甲等医院', title: '天津市第一中心医院（复康院区）', address: '南开区复康路 24 号', phone: '022-23626600', description: '校区西侧较近的大型公立综合医院；危及生命时直接拨打 120。', map: '天津市第一中心医院复康院区' },
      { icon: '警', type: '属地派出所', title: '公安南开分局学府街派出所', address: '南开区鞍山西道学湖里 8 号', phone: '022-27382157；报警 110', description: '负责南开大学社区相关警务服务。紧急报警不要等待派出所办公时间。', map: '天津市公安局南开分局学府街派出所' },
      { icon: '医', type: '公立医院', title: '天津中医药大学第一附属医院（北院区）', address: '南开区鞍山西道 314 号', phone: '022-27987000', description: '位于鞍山西道，适合按专科和门诊安排就医；急症仍优先拨打 120。', map: '天津中医药大学第一附属医院北院区' },
    ],
  },
}

const current = computed(() => campusData[campus.value])
const mapUrl = (keyword) => `https://uri.amap.com/search?keyword=${encodeURIComponent(keyword)}&city=${encodeURIComponent('天津')}&view=map&src=nankai-freshman-guide`
</script>

<template>
  <div class="page inner-page nearby-page">
    <header class="page-header">
      <span class="section-kicker"><i></i> NEARBY INFORMATION</span>
      <h1>周边信息</h1>
      <p>按校区整理地铁、公交、校际通勤，以及医院、公安和公共服务设施的位置。第一次出校前先确认校门，再开始导航。</p>
      <div class="priority-note"><span>!</span><strong>危及生命或人身安全时，不要自行研究路线：医疗急救 120、报警 110、火警 119。</strong></div>
    </header>

    <section class="nearby-switcher" aria-labelledby="nearby-campus-title">
      <div class="section-heading compact"><span class="section-kicker"><i></i> 选择校区</span><h2 id="nearby-campus-title">从哪个校区出发？</h2></div>
      <div class="campus-tabs" role="tablist" aria-label="周边信息校区切换"><button v-for="(data, key) in campusData" :key="key" role="tab" :aria-selected="campus === key" :class="{ active: campus === key }" @click="campus = key">{{ data.name }}</button></div>
      <div class="nearby-campus-summary"><small>{{ current.name }}</small><strong>{{ current.address }}</strong><p>{{ current.summary }}</p></div>
    </section>

    <section aria-labelledby="transport-title">
      <div class="section-heading compact"><span class="section-kicker"><i></i> 交通信息</span><h2 id="transport-title">地铁、公交与校际通勤</h2></div>
      <div class="nearby-card-list"><article v-for="item in current.transport" :key="item.title" class="nearby-card"><span class="nearby-icon" aria-hidden="true">{{ item.icon }}</span><div><small>{{ item.type }}</small><h3>{{ item.title }}</h3><p>{{ item.description }}</p><div class="nearby-note">{{ item.note }}</div><a v-if="item.map" :href="mapUrl(item.map)" target="_blank" rel="noopener">打开地图导航 →</a><a v-else :href="item.source" target="_blank" rel="noopener">查看学校最新时刻表 →</a></div></article></div>
    </section>

    <section aria-labelledby="services-title">
      <div class="section-heading compact"><span class="section-kicker"><i></i> 公共设施</span><h2 id="services-title">医疗、公安与公共服务</h2></div>
      <div class="facility-grid"><article v-for="item in current.services" :key="item.title" class="facility-card"><div class="facility-title"><span aria-hidden="true">{{ item.icon }}</span><small>{{ item.type }}</small></div><h3>{{ item.title }}</h3><p>{{ item.description }}</p><dl><div><dt>地址</dt><dd>{{ item.address }}</dd></div><div><dt>电话</dt><dd>{{ item.phone }}</dd></div></dl><a :href="mapUrl(item.map)" target="_blank" rel="noopener">查看位置 →</a></article></div>
    </section>

    <aside class="route-check"><strong>出发前再检查一次</strong><p>公交线路、首末班车、医院门诊与公共服务时间都可能调整。地图中的预计时间不是应急响应时间；紧急情况应直接拨打专业救援电话，并清楚说明校区、校门和附近建筑。</p></aside>

    <section class="nearby-sources" aria-labelledby="nearby-sources-title"><div class="section-heading compact"><span class="section-kicker"><i></i> 核验来源</span><h2 id="nearby-sources-title">官方信息入口</h2></div><ul><li><a href="https://www.tj.gov.cn/sy/tjxw/202509/t20250926_7142393.html" target="_blank" rel="noopener">天津政务网：地铁 7 号线南段开通信息</a></li><li><a href="https://nkjd.nankai.edu.cn/cwfw/tqbc.htm" target="_blank" rel="noopener">南开大学接待服务中心：校际通勤班车</a></li><li><a href="https://www.tj.gov.cn/zwgk/ggqsydwxxgk/ylws/yy/202409/t20240905_6719263.html" target="_blank" rel="noopener">天津政务网：天津市海河医院</a></li><li><a href="https://www.tj.gov.cn/zwgk/ggqsydwxxgk/ylws/yy/202409/t20240906_6719763.html" target="_blank" rel="noopener">天津政务网：天津市第一中心医院复康院区</a></li><li><a href="https://www.tj.gov.cn/zwgk/szfwj/tjsrmzf/202104/t20210412_5422664.html" target="_blank" rel="noopener">天津政务网：海棠街道驻地</a></li><li><a href="https://ga.tj.gov.cn/" target="_blank" rel="noopener">天津市公安局：警务与报警信息</a></li></ul><p>信息核验于 2026 年 8 月 28 日；实时交通以天津地铁、公交站牌和地图导航为准。</p></section>
  </div>
</template>

<script setup>
const jinnanServices = [
  { name: '学生资助管理中心', address: '大通学生中心 A304-3、A303', phone: '85358189 / 85358848 / 85258946' },
  { name: '学生就业指导中心', address: '大通学生中心 E302', phone: '85358075' },
  { name: '心理健康教育中心', address: '大通学生中心 E306', phone: '85358432' },
  { name: '学生生活指导中心', address: '综合业务西楼师生服务大厅 2 号窗口；大通学生中心 E317', phone: '85358890 转2 / 13682046472', note: '周一至周五 09:00—12:00、13:00—17:00' },
  { name: '校团委', address: '大通学生中心 A301', phone: '85358462' },
  { name: '教务部', address: '综合业务西楼 201—204、251', phone: '23503595' },
  { name: '保卫处', address: '综合业务西楼 212—217', phone: '85358962' },
  { name: '后勤服务处', address: '指挥部 202；综合业务西楼师生服务大厅 7 号窗口', phone: '88973268 / 85358890 转7' },
  { name: '财务处报账大厅', address: '综合业务西楼 102', phone: '85358196' },
  { name: '网信办', address: '综合业务西楼师生服务大厅 19 号窗口', phone: '85358890 转19', note: '校园卡补办、信息门户及校园卡密码重置' },
  { name: '收发室', address: '文科福莲餐厅旁边', phone: '无公开电话' },
]

const dormServices = [
  { name: '综合报修', jinnan: '022-85358535', detail: '上下水、电气线路、路灯、房屋外檐、楼道、屋顶、门窗、空调、饮水机、洗衣机、自助打印机与洗浴热水。' },
  { name: '暖气报修', jinnan: '85358535', balitai: '23509682 / 23509936' },
  { name: '网络故障', jinnan: '85358100', balitai: '23503656 / 23503634' },
  { name: '水电缴费', jinnan: '85358890 转8', balitai: '23502600' },
  { name: '住宿费缴费与票据', jinnan: '23507128' },
  { name: '住宿费金额', jinnan: '85358890 转2', balitai: '23509433' },
]
</script>

<template>
  <div class="page inner-page service-guide-page">
    <header class="page-header">
      <span class="section-kicker"><i></i> CAMPUS SERVICE GUIDE</span>
      <h1>办事指南</h1>
      <p>集中查询学生事务、校园卡、后勤与宿舍服务的办理地点和联系电话。</p>
      <div class="priority-note"><span>!</span><strong>无特殊说明均为津南校区；前往窗口前建议先致电确认当天办公安排。</strong></div>
    </header>

    <section class="campus-service-directory" aria-labelledby="campus-service-title">
      <div class="section-heading compact"><span class="section-kicker"><i></i> 津南校区</span><h2 id="campus-service-title">常用校内服务窗口</h2></div>
      <div class="campus-service-grid">
        <article v-for="service in jinnanServices" :key="service.name">
          <h3>{{ service.name }}</h3>
          <p>{{ service.address }}</p>
          <strong>{{ service.phone }}</strong>
          <small v-if="service.note">{{ service.note }}</small>
        </article>
      </div>
      <div class="balitai-service-note"><strong>八里台学生生活指导中心</strong><span>学生活动中心 401 · 周一至周五 08:00—12:00、14:00—18:00 · 23509433 / 13194628628（金昭辉老师）</span></div>
    </section>

    <section aria-labelledby="dorm-service-title">
      <div class="section-heading compact"><span class="section-kicker"><i></i> 宿舍服务</span><h2 id="dorm-service-title">报修、网络与缴费电话</h2></div>
      <div class="dorm-service-grid service-guide-dorm-grid">
        <article v-for="service in dormServices" :key="service.name">
          <small>{{ service.name }}</small>
          <strong>津南 {{ service.jinnan }}</strong>
          <p v-if="service.balitai">八里台：{{ service.balitai }}</p>
          <p v-if="service.detail">{{ service.detail }}</p>
        </article>
      </div>
      <aside class="service-call-note"><strong>报修时请一次说清</strong><p>校区、宿舍楼、房间号、故障现象和可联系手机号；涉及漏水、焦糊味、冒烟等情况时，先远离危险位置并同时联系楼宇值班人员。</p></aside>
    </section>

    <aside class="common-links-note"><span aria-hidden="true">i</span><p>本页依据学校服务信息整理并于 2026 年 9 月 1 日更新；窗口位置、办公时间和联系电话如有调整，以对应部门最新通知为准。</p></aside>
  </div>
</template>

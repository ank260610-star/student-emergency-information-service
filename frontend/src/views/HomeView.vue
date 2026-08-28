<script setup>
import { RouterLink } from 'vue-router'

const stages = [
  ['01', '启程之前', '核对材料、行程和住宿安排'],
  ['02', '抵达校园', '完成报到并熟悉校区动线'],
  ['03', '安顿下来', '处理校园卡、网络与生活事项'],
  ['04', '融入南开', '认识同学、参与活动、规划学习'],
]

const portals = [
  { eyebrow: 'FOR NEW STUDENTS', title: '我是新生', description: '从行前准备到入校安顿，用一份清晰清单开启大一生活。', action: '进入报到指南', to: '/orientation-guide', symbol: '新', featured: true },
  { eyebrow: 'FOR STUDENT LEADERS', title: '我是学生骨干', description: '保留原有应急联络、校园地图与规范上报信息服务。', action: '进入应急信息服务', to: '/contacts', symbol: '应' },
  { eyebrow: 'FOR SENIOR STUDENTS', title: '我是学长学姐', description: '分享真实、可靠、可复核的校园经验，帮助新生少走弯路。', action: '参与内容共建', to: '/contribute', symbol: '共' },
]
</script>

<template>
  <div class="page home-page">
    <section class="home-hero freshman-hero">
      <div class="hero-copy">
        <span class="section-kicker"><i></i> 南开大学新生生活指北</span>
        <h1>从报到第一天，<br /><em>从容走进南开。</em></h1>
        <p>面向即将进入大一生活的新生，汇集报到准备、校园生活与应急联络等关键实用信息，也邀请学生骨干和学长学姐共同维护。</p>
        <div class="hero-actions"><RouterLink class="button primary" to="/orientation-guide">开始报到准备 <span>→</span></RouterLink><RouterLink class="button secondary" to="/campus-map">先看校园地图</RouterLink><RouterLink class="button secondary" to="/nearby">查看周边信息</RouterLink></div>
      </div>
      <div class="hero-emblem hero-seal"><img src="/images/nankai-university-logo.png" alt="南开大学校徽" /><p>允公允能<br />日新月异</p></div>
    </section>

    <aside class="fraud-alert" aria-labelledby="fraud-title">
      <span class="fraud-alert-symbol" aria-hidden="true">!</span>
      <div class="fraud-alert-copy"><small>新生防诈骗提醒</small><h2 id="fraud-title">校园内推销，也要先核验身份</h2><p>不要轻易相信自称“学长学姐”并推销校园卡、校园墙服务或英语学习课程的人。学校校园卡由官方渠道发放；不要因“限时优惠”“统一办理”当场转账、交押金、扫码进群或提供身份证、验证码和统一身份账号。</p></div>
      <div class="fraud-alert-actions"><strong>拿不准时</strong><span>先问辅导员或保卫处</span><span>被骗或受威胁立即拨打 110</span></div>
    </aside>

    <section class="portal-section" aria-labelledby="portal-title">
      <div class="section-heading"><span class="section-kicker"><i></i> 选择入口</span><h2 id="portal-title">你希望从哪里开始？</h2></div>
      <div class="role-grid">
        <RouterLink v-for="portal in portals" :key="portal.title" class="role-card" :class="{ featured: portal.featured }" :to="portal.to">
          <span class="role-symbol" aria-hidden="true">{{ portal.symbol }}</span>
          <small>{{ portal.eyebrow }}</small>
          <strong>{{ portal.title }}</strong>
          <p>{{ portal.description }}</p>
          <b>{{ portal.action }} <span>→</span></b>
        </RouterLink>
      </div>
    </section>

    <section class="process-section" aria-labelledby="process-title">
      <div class="section-heading"><span class="section-kicker"><i></i> 新生旅程</span><h2 id="process-title">把陌生拆成清晰的四步</h2></div>
      <ol class="step-grid"><li v-for="stage in stages" :key="stage[0]"><span class="step-number">{{ stage[0] }}</span><div><strong>{{ stage[1] }}</strong><p>{{ stage[2] }}</p></div></li></ol>
    </section>

    <aside class="safety-banner welcome-banner"><span class="safety-symbol" aria-hidden="true">南</span><div><strong>信息会更新，判断有依据</strong><p>生活经验可作参考；报到时间、材料要求及重要安排请以学校和学院最新官方通知为准。</p></div></aside>
  </div>
</template>

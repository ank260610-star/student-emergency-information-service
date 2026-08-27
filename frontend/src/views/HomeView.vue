<script setup>
import { RouterLink } from 'vue-router'
const steps = [['01', '判断情况', '快速识别风险程度'], ['02', '保护现场', '确保自身与他人安全'], ['03', '及时报告', '说清时间、地点与状态'], ['04', '组织协同', '听从老师与专业人员指引']]
</script>

<template>
  <div class="page home-page">
    <section class="home-hero">
      <div class="hero-copy">
        <span class="section-kicker"><i></i> 学生骨干应急信息服务</span>
        <h1>在关键时刻，<br /><em>先做正确的第一步。</em></h1>
        <p>为大一新生骨干提供简明、可靠的应急信息指引，帮助你在不越位的前提下及时报告、联络资源。</p>
        <div class="hero-actions"><RouterLink class="button primary" to="/contacts">查找紧急联络人 <span>→</span></RouterLink><RouterLink class="button secondary" to="/campus-map">查看校园地图</RouterLink></div>
      </div>
      <div class="hero-emblem"><img src="/images/nankai-university-logo.png" alt="南开大学校徽" /></div>
    </section>
    <section class="process-section" aria-labelledby="process-title">
      <div class="section-heading"><span class="section-kicker"><i></i> 应急四步</span><h2 id="process-title">保持冷静，有序应对</h2></div>
      <ol class="step-grid"><li v-for="step in steps" :key="step[0]"><span class="step-number">{{ step[0] }}</span><div><strong>{{ step[1] }}</strong><p>{{ step[2] }}</p></div></li></ol>
    </section>
    <section class="quick-section" aria-labelledby="quick-title">
      <div class="section-heading"><span class="section-kicker"><i></i> 快速入口</span><h2 id="quick-title">你现在需要什么？</h2></div>
      <div class="entry-grid">
        <RouterLink class="entry-card" to="/contacts"><span class="entry-icon phone-icon">☎</span><span><strong>紧急联络人</strong><small>快速找到应联系的角色与渠道，了解联系前需要准备的信息。</small><b>立即查看 →</b></span></RouterLink>
        <RouterLink class="entry-card" to="/campus-map"><span class="entry-icon map-icon">◇</span><span><strong>校园地图</strong><small>快速确认校区、建筑和集合位置，为报告与引导提供参考。</small><b>立即查看 →</b></span></RouterLink>
      </div>
    </section>
    <aside class="safety-banner"><span class="safety-symbol" aria-hidden="true">!</span><div><strong>请牢记安全边界</strong><p>学生骨干不替代医生、辅导员、保卫等专业人员；遇到生命安全风险时，应优先呼叫专业救援力量。</p></div></aside>
  </div>
</template>

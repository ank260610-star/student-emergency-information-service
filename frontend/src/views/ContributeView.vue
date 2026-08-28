<script setup>
const contributionAreas = [
  ['生', '校园生活', '哪里的饭好吃，哪里的厕所干净一些……这些都可以成为大家贡献的方向。'],
  ['团', '社团资讯', '关于社团的历史、沿革与活动，以及社团最新的资讯。'],
  ['学', '学习指南', '分享你的学习心得与体会，让后来者少走一些弯路。'],
  ['考', '报考指南', '老登们的大学如何？有没有给学弟学妹的建议？这些也可以收录进网站。'],
]

const principles = ['注明信息适用的校区与时间', '事实信息尽量附官方来源', '保护个人隐私，不公开私人联系方式', '不夸大、不制造焦虑，及时修正过期内容']
</script>

<template>
  <div class="page inner-page contribute-page">
    <header class="page-header contribute-header">
      <span class="section-kicker"><i></i> CONTRIBUTE</span>
      <h1>参与贡献</h1>
      <p>如果你希望参加本网站的编辑工作，提出内容修改意见，或者参与技术维护，欢迎联系我们。</p>
    </header>

    <section aria-labelledby="areas-title">
      <div class="section-heading compact"><span class="section-kicker"><i></i> 共建方向</span><h2 id="areas-title">哪些经验值得留下？</h2></div>
      <div class="contribution-grid"><article v-for="area in contributionAreas" :key="area[1]"><span>{{ area[0] }}</span><div><h3>{{ area[1] }}</h3><p>{{ area[2] }}</p></div></article></div>
      <p class="contribution-more">如果你想更新其他分区，也同样欢迎联系我们！</p>
    </section>

    <section class="contribution-standard" aria-labelledby="standard-title">
      <div><span class="section-kicker light"><i></i> 内容原则</span><h2 id="standard-title">真实、清楚、可复核</h2><p>好的经验不是“听说”，而是能说明适用范围、信息时间和依据。</p></div>
      <ul><li v-for="principle in principles" :key="principle"><span aria-hidden="true">✓</span>{{ principle }}</li></ul>
    </section>

    <section class="contribution-action" aria-labelledby="action-title">
      <div><span class="section-kicker"><i></i> 联系我们</span><h2 id="action-title">加入编辑与维护</h2><p>请在邮件中说明你希望参与编辑、提出修改意见，还是参与技术维护；内容建议请注明适用校区、时间与信息来源。</p><a class="contribution-email" href="mailto:azk.support@fallaxaura.dpdns.org">azk.support@fallaxaura.dpdns.org</a></div>
      <div class="contribution-action-buttons"><a class="button primary" href="mailto:azk.support@fallaxaura.dpdns.org">发送邮件 <span>→</span></a><a class="button secondary" href="https://github.com/ank260610-star/student-emergency-information-service/issues/new" target="_blank" rel="noopener">提交 GitHub Issue</a></div>
    </section>
  </div>
</template>

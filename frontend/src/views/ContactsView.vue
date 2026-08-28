<script setup>
import { ref } from 'vue'

const expanded = ref({})
const contacts = [
  {
    icon: '✚', title: '校医院 / 医疗急救资源', tags: ['突发疾病', '意外受伤'], verified: true,
    note: '当出现身体不适、急性症状或意外伤害时，先确保环境安全并寻求专业帮助。',
    featuredLabel: '急诊室', featured: '津南 85358311 · 八里台 23502400',
    more: [
      { name: '急诊室', jinnan: '85358311', balitai: '23502400' },
      { name: '办公室', jinnan: '85358254', balitai: '23498917' },
      { name: '院长室', jinnan: '23508254' },
      { name: '预防科', jinnan: '85358772', balitai: '23508586' },
    ],
  },
  {
    icon: '◈', title: '校园保卫与安全服务', tags: ['安全风险', '治安事件'], verified: true,
    note: '遇到校园安全风险、可疑人员或需要现场秩序支持时，应及时报告。',
    featuredLabel: '值班室', featured: '津南 85358122 · 八里台 23508538 / 23508122',
    more: [
      { name: '值班室', jinnan: '85358122', balitai: '23508538 / 23508122' },
      { name: '监控室', jinnan: '85358962', balitai: '23508962' },
      { name: '办公室', jinnan: '85358257', balitai: '23508337' },
      { name: '处长室', jinnan: '85358537', balitai: '23508537' },
      { name: '副处长室', jinnan: '85358736', balitai: '23508642' },
      { name: '综合治理办公室', balitai: '23508337' },
      { name: '政保科', jinnan: '85358337', balitai: '23504221' },
      { name: '安全科', jinnan: '85358808', balitai: '23508808' },
      { name: '治安科', jinnan: '85358331', balitai: '23507785 / 23505331' },
      { name: '八里台东门', balitai: '23508219' },
      { name: '八里台西南门', balitai: '23508262' },
      { name: '八里台西门', balitai: '23508181' },
      { name: '津南东门', jinnan: '85358589' },
      { name: '津南西门', jinnan: '85358226' },
      { name: '津南南门', jinnan: '85358210' },
      { name: '津南西北门', jinnan: '85358292' },
      { name: '津南北门', jinnan: '85358869' },
      { name: '辅导员基地办公室', jinnan: '85358713' },
    ],
  },
  { icon: '▣', title: '学院辅导员 / 值班老师', tags: ['综合协调', '信息上报'], note: '需要学院层面协调资源、核实情况或进行后续上报时，联系辅导员或值班老师。', more: [] },
  { icon: '⌂', title: '宿舍管理服务', tags: ['住宿事务', '设施风险'], note: '遇到宿舍设施故障、水电异常或楼内突发状况时，就近联系宿管人员。', more: [] },
  { icon: '♡', title: '心理支持与咨询资源', tags: ['心理危机', '情绪支持'], note: '发现同学存在明显心理危机或伤害风险时，陪伴并及时向老师与专业人员求助。', more: [] },
]
</script>

<template>
  <div class="page inner-page">
    <header class="page-header"><span class="section-kicker"><i></i> EMERGENCY CONTACTS</span><h1>紧急联络人</h1><p>已录入学校核验的保卫处与校医院联络信息。</p><div class="priority-note"><span>!</span><strong>紧急情况中，先保障安全，再报告与联络。</strong></div></header>
    <section aria-labelledby="directory-title">
      <div class="section-heading compact"><span class="section-kicker"><i></i> 联络目录</span><h2 id="directory-title">按情形选择联系对象</h2></div>
      <div class="contact-list">
        <article v-for="(contact, index) in contacts" :key="contact.title" class="contact-card">
          <div class="contact-icon" aria-hidden="true">{{ contact.icon }}</div>
          <div class="contact-body">
            <div class="contact-title-row"><h3>{{ contact.title }}</h3><span v-if="contact.verified" class="status verified">已核验</span></div>
            <div class="tag-row"><span v-for="tag in contact.tags" :key="tag">{{ tag }}</span></div>
            <p>{{ contact.note }}</p>
            <div v-if="contact.featured" class="contact-detail"><span>{{ contact.featuredLabel }}</span><strong>{{ contact.featured }}</strong></div>
            <button v-if="contact.more.length" class="expand-button" type="button" :aria-expanded="!!expanded[index]" :aria-controls="`contact-details-${index}`" @click="expanded[index] = !expanded[index]">{{ expanded[index] ? '收起全部联系方式' : '展开查看全部联系方式' }} <span aria-hidden="true">{{ expanded[index] ? '−' : '＋' }}</span></button>
            <ul v-if="expanded[index]" :id="`contact-details-${index}`" class="subcontact-list">
              <li v-for="item in contact.more" :key="item.name">
                <span>{{ item.name }}</span>
                <span class="campus-numbers"><strong v-if="item.jinnan">津南 {{ item.jinnan }}</strong><strong v-if="item.balitai">八里台 {{ item.balitai }}</strong></span>
              </li>
            </ul>
          </div>
        </article>
      </div>
    </section>
    <section class="report-script" aria-labelledby="script-title"><span class="quote-mark" aria-hidden="true">“</span><div><span class="section-kicker"><i></i> 上报话术</span><h2 id="script-title">把关键信息说清楚</h2><blockquote>我在 <u>地点</u>，发现 <u>情况</u>。目前 <u>人数</u> 人受影响，已采取 <u>措施</u>，请协助 / 指示。</blockquote></div></section>
    <section class="boundary-section" aria-labelledby="boundary-title"><div class="section-heading compact"><span class="section-kicker"><i></i> 使用边界</span><h2 id="boundary-title">学生骨干应当做到</h2></div><ul class="boundary-grid"><li><span>×</span>不擅自诊断</li><li><span>×</span>不传播未经证实的信息</li><li><span>×</span>不擅自处理能力范围外的事</li><li><span>×</span>不单独行动</li></ul></section>
  </div>
</template>

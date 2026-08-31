<script setup>
import { computed, ref } from 'vue'

const schoolAccounts = [
  { name: '南开大学', category: '学校官方', description: '发布学校综合资讯；学费、住宿费等缴费安排也会通过该账号发布。' },
  { name: '南开大学本科招生', category: '招生服务', description: '发布本科招生政策、招生动态和新生相关提醒。' },
  { name: '南开大学教务部', category: '教学服务', description: '发布选课退课、考试安排、成绩与学业指导讲座等教务通知。' },
  { name: '南开大学体育场馆管理中心', category: '场馆服务', description: '查询体育场馆开放时间、预约方式以及集体活动场地申请安排。' },
  { name: '南开体育之声', category: '体育教学', description: '发布体测、体育理论考试、创高课程及校园体育活动通知。' },
  { name: '南开大学团委', category: '团学活动', description: '发布校级学生组织活动、志愿招募及青年大学习等团学信息。' },
  { name: '南开大学学生创新创业', category: '创新创业', description: '发布创新创业竞赛、活动、项目和交流讲座通知。' },
  { name: '南开大学医保', id: 'nkdxyb', category: '医疗保障', description: '查询学生医保政策、报销材料与办理通知；具体报销仍需按当期要求办理。' },
  { name: '南开大学一卡通', category: '校园卡', description: '校园卡激活后可在公众号内查询服务和充值，支付宝小程序也可使用。' },
  { name: '南开后勤服务', category: '后勤报修', description: '宿舍设施损坏或需要维修时，可通过该账号查看报修服务。' },
  { name: '南开微学工', category: '学生工作', description: '发布学生社区、学生活动、党团建设及学生事务相关信息。' },
]

const collegeAccounts = [
  { college: '文学院', accounts: [{ name: '南开大学文学院', id: 'NKUWXY', type: '学院官方' }, { name: '南开文院人', id: 'gh_bbfa3b6d3662', type: '学生工作' }] },
  { college: '历史学院', accounts: [{ name: '南开史学', id: 'gh_2e78f9377be3', type: '学院官方' }] },
  { college: '哲学院', accounts: [{ name: '南开大学哲学院', id: 'gh_947a0f59673b', type: '学院官方' }] },
  { college: '法学院', accounts: [{ name: '南开大学法学院', id: 'gh_9b292921bb92', type: '学院官方' }, { name: '南开法学生', id: 'gh_d4727ef94450', type: '学生工作' }] },
  { college: '周恩来政府管理学院', accounts: [{ name: '南开大学政府学院', id: 'NKU-ZFXY', type: '学院官方' }] },
  { college: '外国语学院', accounts: [{ name: 'NK外院', id: 'NKWYtuanwei', type: '学院官方' }] },
  { college: '马克思主义学院', accounts: [{ name: '南开马院', id: 'nkmllt', type: '学院官方' }] },
  { college: '经济学院', accounts: [{ name: '南开大学经济学院', id: 'NK_ECO', type: '学院官方' }, { name: '南开大学经院e学工', id: 'nkjjxye', type: '学生工作' }] },
  { college: '商学院', accounts: [{ name: '南开商学院', id: 'BSofNKU', type: '学院官方' }, { name: '南开商青年', id: 'NK-sqn', type: '团学工作' }, { name: '南开大学商学院专硕', id: 'NKU_ZS', type: '专业学位' }] },
  { college: '统计与数据科学学院', accounts: [{ name: '南开大学统计与数据科学学院', id: 'nkustat2013', type: '学院官方' }, { name: '统院拾光', id: 'nkstat_student', type: '学生工作' }] },
  { college: '数学科学学院', accounts: [{ name: 'NK数院', id: 'nankaishuyuan', type: '学院官方' }] },
  { college: '物理科学学院', accounts: [{ name: '南开物理', id: 'gh_aa481bbd3e7f', type: '学院官方' }, { name: 'NKPhysics', id: 'gh_8036f309d9a8', type: '学生工作' }] },
  { college: '化学学院', accounts: [{ name: '南开化学', id: 'nankaichem', type: '学院官方' }, { name: 'NK化学家', id: 'NKHXTW', type: '团学工作' }] },
  { college: '生命科学学院', accounts: [{ name: '南开生物', id: 'nkshengwu', type: '学院官方' }] },
  { college: '医学院', accounts: [{ name: '南开大学医学院', id: 'nkuyxy', type: '学院官方' }] },
  { college: '密码与网络空间安全学院', accounts: [{ name: 'NKU网安', id: 'gh_eb71955804e3', type: '学院官方' }] },
  { college: '人工智能学院', accounts: [{ name: 'NK人工智能', id: 'gh_58558ee1b5ca', type: '学院官方' }] },
  { college: '计算机学院', accounts: [{ name: 'NKU计算机', id: 'gh_1ca2d60b5db8', type: '学院官方' }] },
  { college: '电子信息与光学工程学院', accounts: [{ name: '南开电光之家NKU', id: 'gh_9bb00c5be56b', type: '学院官方' }] },
  { college: '软件学院', accounts: [{ name: '南开大学软件学院', id: 'NKUSOFTWARE', type: '学院官方' }] },
  { college: '汉语言文化学院', accounts: [{ name: 'NKU汉院', id: 'gh_8123b102a077', type: '学院官方' }] },
  { college: '旅游与服务学院', accounts: [{ name: '南开大学旅游与服务学院（青春南旅）', id: 'gh_d1f852149408', type: '学院官方' }] },
  { college: '药学院', accounts: [{ name: '南开大学药学院', id: 'NKUpharmacy', type: '学院官方' }] },
  { college: '金融学院', accounts: [{ name: '南开大学金融学院', id: 'NKjrxy', type: '学院官方' }, { name: '南开金融青年', id: 'nkdxjrxyxgzx', type: '团学工作' }] },
  { college: '材料科学与工程学院', accounts: [{ name: '南开材料', id: 'NKUMSE', type: '学院官方' }] },
  { college: '信息与传播学院', note: '原新闻与传播学院账号', accounts: [{ name: '南开新传', id: 'gh_f82586d3b3b6', type: '学院官方' }, { name: '小传向南开', id: 'gh_2a5a76ecba44', type: '学生工作' }] },
  { college: '社会学院', accounts: [{ name: '群学南开', id: 'gh_b5c9e2f11306', type: '学院官方' }] },
  { college: '环境科学与工程学院', accounts: [{ name: '南开环境', id: 'nkhuanjing', type: '学院官方' }] },
]

const query = ref('')
const selectedName = ref('')
const copySucceeded = ref(false)
let copiedTimer

const normalizedQuery = computed(() => query.value.trim().toLowerCase())
const includesQuery = (...values) => !normalizedQuery.value || values.some((value) => String(value || '').toLowerCase().includes(normalizedQuery.value))

const filteredSchoolAccounts = computed(() => schoolAccounts.filter((item) => includesQuery(item.name, item.id, item.category, item.description)))
const filteredCollegeAccounts = computed(() => collegeAccounts
  .map((item) => ({ ...item, accounts: item.accounts.filter((account) => includesQuery(item.college, item.note, account.name, account.id, account.type)) }))
  .filter((item) => item.accounts.length))

async function copyAccount(name) {
  selectedName.value = name
  copySucceeded.value = false
  window.clearTimeout(copiedTimer)
  let copied = false
  try {
    await Promise.race([
      navigator.clipboard.writeText(name),
      new Promise((_, reject) => window.setTimeout(() => reject(new Error('clipboard timeout')), 800)),
    ])
    copied = true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = name
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    copied = document.execCommand('copy')
    textarea.remove()
  }
  if (!copied) return
  copySucceeded.value = true
  copiedTimer = window.setTimeout(() => { selectedName.value = '' }, 1800)
}
</script>

<template>
  <div class="page inner-page wechat-page">
    <header class="page-header">
      <span class="section-kicker"><i></i> WECHAT DIRECTORY</span>
      <h1>常用公众号</h1>
      <p>汇总校级服务与各学院官方账号。复制名称后，在微信“搜一搜”中选择“公众号”即可查找。</p>
    </header>

    <label class="wechat-search">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>
      <input v-model="query" type="search" placeholder="搜索公众号、学院或微信号" aria-label="搜索公众号、学院或微信号">
      <small>{{ filteredSchoolAccounts.length + filteredCollegeAccounts.reduce((total, item) => total + item.accounts.length, 0) }} 个结果</small>
    </label>
    <div v-if="selectedName" class="wechat-copy-result" role="status">
      <span>{{ copySucceeded ? '已复制公众号名称' : '浏览器未允许自动复制，请手动复制' }}</span>
      <strong>{{ selectedName }}</strong>
    </div>

    <section class="wechat-section" aria-labelledby="school-accounts-title">
      <div class="section-heading compact">
        <span class="section-kicker"><i></i> 校级服务</span>
        <h2 id="school-accounts-title">新生常用公众号</h2>
        <p>覆盖缴费、教务、场馆、医保、后勤与学生工作等高频事务。</p>
      </div>
      <div v-if="filteredSchoolAccounts.length" class="school-account-grid">
        <article v-for="item in filteredSchoolAccounts" :key="item.name" class="wechat-account-card">
          <span class="wechat-account-mark" aria-hidden="true">{{ item.name.slice(0, 1) }}</span>
          <div>
            <small>{{ item.category }}</small>
            <h3>{{ item.name }}</h3>
            <p>{{ item.description }}</p>
            <span v-if="item.id" class="wechat-id">微信号：{{ item.id }}</span>
          </div>
          <button type="button" @click="copyAccount(item.name)">{{ selectedName === item.name ? (copySucceeded ? '已复制' : '名称已显示') : '复制名称' }}</button>
        </article>
      </div>
    </section>

    <section class="wechat-section" aria-labelledby="college-accounts-title">
      <div class="section-heading compact">
        <span class="section-kicker"><i></i> 学院矩阵</span>
        <h2 id="college-accounts-title">各学院公众号</h2>
        <p>学院账号主要发布培养安排、学生活动、评奖评优和院内事务；同一学院的多个账号均予保留。</p>
      </div>
      <div v-if="filteredCollegeAccounts.length" class="college-account-grid">
        <article v-for="item in filteredCollegeAccounts" :key="item.college" class="college-account-card">
          <header>
            <span aria-hidden="true">{{ item.college.slice(0, 1) }}</span>
            <div><h3>{{ item.college }}</h3><small>{{ item.note || '学院通知与学生事务入口' }}</small></div>
          </header>
          <ul>
            <li v-for="account in item.accounts" :key="account.name">
              <div><strong>{{ account.name }}</strong><small>{{ account.type }} · {{ account.id }}</small></div>
              <button type="button" @click="copyAccount(account.name)">{{ selectedName === account.name ? (copySucceeded ? '已复制' : '名称已显示') : '复制' }}</button>
            </li>
          </ul>
        </article>
      </div>
    </section>

    <div v-if="!filteredSchoolAccounts.length && !filteredCollegeAccounts.length" class="wechat-empty">没有找到匹配的公众号，请尝试学院简称或微信号。</div>

    <aside class="wechat-guide">
      <strong>关注前请核验认证主体</strong>
      <p>打开微信 → 搜一搜 → 公众号 → 粘贴名称或微信号。公众号可能改名或迁移，请优先选择认证主体为“南开大学”或对应学院的账号，并以学院最新通知为准。</p>
    </aside>
  </div>
</template>

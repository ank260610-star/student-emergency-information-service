<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { schoolAccounts, collegeAccounts } from '../data/wechatAccounts'
import { copyText } from '../utils/clipboard'

const query = ref('')
const selectedName = ref('')
const copySucceeded = ref(false)
const copying = ref(false)
let copiedTimer
let disposed = false

const normalizedQuery = computed(() => query.value.trim().toLowerCase())
const includesQuery = (...values) => !normalizedQuery.value || values.some((value) => String(value || '').toLowerCase().includes(normalizedQuery.value))

const filteredSchoolAccounts = computed(() => schoolAccounts.filter((item) => includesQuery(item.name, item.id, item.category, item.description)))
const filteredCollegeAccounts = computed(() => collegeAccounts
  .map((item) => ({ ...item, accounts: item.accounts.filter((account) => includesQuery(item.college, item.note, account.name, account.id, account.type)) }))
  .filter((item) => item.accounts.length))

async function copyAccount(name) {
  if (copying.value) return
  copying.value = true
  selectedName.value = name
  copySucceeded.value = false
  window.clearTimeout(copiedTimer)
  const copied = await copyText(name)
  if (disposed) return
  copying.value = false
  copySucceeded.value = copied
  if (copied) copiedTimer = window.setTimeout(() => { selectedName.value = '' }, 1800)
}

onBeforeUnmount(() => {
  disposed = true
  window.clearTimeout(copiedTimer)
})
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
      <span>{{ copying ? '正在复制公众号名称…' : copySucceeded ? '已复制公众号名称' : '浏览器未允许自动复制，请长按名称手动复制' }}</span>
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
          <button type="button" :disabled="copying" @click="copyAccount(item.name)">{{ selectedName === item.name ? (copySucceeded ? '已复制' : '名称已显示') : '复制名称' }}</button>
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
              <button type="button" :disabled="copying" @click="copyAccount(account.name)">{{ selectedName === account.name ? (copySucceeded ? '已复制' : '名称已显示') : '复制' }}</button>
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

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

const menuOpen = ref(false)
const showIntro = ref(true)
const visitCount = ref(null)
const visitCountStatus = ref('loading')
const route = useRoute()
const formattedVisitCount = computed(() => (
  visitCount.value === null ? '—' : new Intl.NumberFormat('zh-CN').format(visitCount.value)
))
let introTimer

watch(() => route.fullPath, () => { menuOpen.value = false })

onMounted(async () => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  introTimer = window.setTimeout(() => { showIntro.value = false }, reducedMotion ? 500 : 3200)

  try {
    const response = await fetch('/api/visits', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      credentials: 'same-origin',
    })

    if (!response.ok) throw new Error(`Visit counter returned ${response.status}`)

    const data = await response.json()
    if (!Number.isSafeInteger(data.total) || data.total < 0) throw new Error('Invalid visit count')

    visitCount.value = data.total
    visitCountStatus.value = 'ready'
  } catch (error) {
    visitCountStatus.value = 'error'
    console.warn('Unable to load the visit counter.', error)
  }
})

onBeforeUnmount(() => window.clearTimeout(introTimer))

function dismissIntro() {
  window.clearTimeout(introTimer)
  showIntro.value = false
}
</script>

<template>
  <Transition name="intro">
    <div v-if="showIntro" class="intro-screen" role="status" aria-label="南开大学校徽与校训入场动画">
      <div class="intro-glow" aria-hidden="true"></div>
      <div class="intro-identity">
        <div class="intro-emblem"><img src="/images/nankai-university-logo.png" alt="南开大学校徽" /></div>
        <div class="intro-rule" aria-hidden="true"><i></i></div>
        <p class="intro-motto">允公允能&nbsp;&nbsp;日新月异</p>
        <span>南开大学 · 新生生活指北</span>
      </div>
      <button type="button" class="intro-skip" @click="dismissIntro">跳过动画</button>
    </div>
  </Transition>
  <div class="app-shell">
    <header class="mobile-header">
      <RouterLink class="mobile-brand" to="/" aria-label="返回首页"><span class="brand-mark logo-mark"><img src="/images/nankai-university-logo.png" alt="" /></span><span>南开新生指北</span></RouterLink>
      <button class="menu-button" type="button" :aria-expanded="menuOpen" aria-controls="site-sidebar" @click="menuOpen = !menuOpen">
        <span class="sr-only">{{ menuOpen ? '关闭导航菜单' : '打开导航菜单' }}</span><span></span><span></span><span></span>
      </button>
    </header>
    <div v-if="menuOpen" class="menu-backdrop" aria-hidden="true" @click="menuOpen = false"></div>
    <aside id="site-sidebar" class="sidebar" :class="{ open: menuOpen }">
      <RouterLink class="brand" to="/" aria-label="南开新生生活指北首页">
        <span class="brand-mark logo-mark"><img src="/images/nankai-university-logo.png" alt="" /></span>
        <span class="brand-copy"><strong>南开新生<br />生活指北</strong><small>从容报到 · 安心生活 · 共同成长</small></span>
      </RouterLink>
      <nav class="side-nav" aria-label="主要导航">
        <RouterLink to="/" exact-active-class="router-link-active">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8v9H4v-9Zm6 9v-6h6v6"/></svg>
          <span><strong>首页</strong><small>选择适合你的入口</small></span>
        </RouterLink>
        <RouterLink to="/orientation-guide">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5"/></svg>
          <span><strong>报到指南</strong><small>新生入校关键事项</small></span>
        </RouterLink>
        <RouterLink to="/contacts">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-3 2a15 15 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2C9.7 21 3 14.3 3 6a2 2 0 0 1 2-2Z"/></svg>
          <span><strong>紧急联络人</strong><small>查找角色与联络要点</small></span>
        </RouterLink>
        <RouterLink to="/campus-map">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/></svg>
          <span><strong>校园地图</strong><small>确认校区与常用位置</small></span>
        </RouterLink>
        <RouterLink to="/nearby">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>
          <span><strong>周边信息</strong><small>交通与公共服务设施</small></span>
        </RouterLink>
        <RouterLink to="/contribute">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 5.6-7 10-7 10Zm0-8v5m-2.5-2.5h5"/></svg>
          <span><strong>参与贡献</strong><small>学长学姐共建指北</small></span>
        </RouterLink>
      </nav>
      <div class="sidebar-bottom">
        <section
          class="visit-count-card"
          :class="`is-${visitCountStatus}`"
          :title="visitCountStatus === 'error' ? '暂时无法读取访问次数' : undefined"
          aria-label="网站累计访问次数"
        >
          <span class="visit-count-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M2.8 12s3.2-6 9.2-6 9.2 6 9.2 6-3.2 6-9.2 6-9.2-6-9.2-6Z"/><circle cx="12" cy="12" r="2.7"/></svg>
          </span>
          <span class="visit-count-copy">
            <small>累计访问次数</small>
            <strong aria-live="polite">{{ formattedVisitCount }}</strong>
          </span>
        </section>
        <div class="sidebar-notice"><span aria-hidden="true">!</span><p>紧急情况请优先联系专业救援力量，并以学校官方通知为准。</p></div>
      </div>
    </aside>
    <main class="main-content">
      <RouterView />
      <footer class="site-footer"><span>南开大学新生生活指北</span><span>实用信息持续更新 · 重要事项以学校官方通知为准</span></footer>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

const menuOpen = ref(false)
const visitCount = ref(null)
const visitCountStatus = ref('loading')
const route = useRoute()
const formattedVisitCount = computed(() => (
  visitCount.value === null ? '—' : new Intl.NumberFormat('zh-CN').format(visitCount.value)
))

watch(() => route.fullPath, () => { menuOpen.value = false })

onMounted(async () => {
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
</script>

<template>
  <div class="app-shell">
    <header class="mobile-header">
      <RouterLink class="mobile-brand" to="/" aria-label="返回首页"><span class="brand-mark logo-mark"><img src="/images/nankai-university-logo.png" alt="" /></span><span>应急信息服务</span></RouterLink>
      <button class="menu-button" type="button" :aria-expanded="menuOpen" aria-controls="site-sidebar" @click="menuOpen = !menuOpen">
        <span class="sr-only">{{ menuOpen ? '关闭导航菜单' : '打开导航菜单' }}</span><span></span><span></span><span></span>
      </button>
    </header>
    <div v-if="menuOpen" class="menu-backdrop" aria-hidden="true" @click="menuOpen = false"></div>
    <aside id="site-sidebar" class="sidebar" :class="{ open: menuOpen }">
      <RouterLink class="brand" to="/" aria-label="学生骨干应急信息服务首页">
        <span class="brand-mark logo-mark"><img src="/images/nankai-university-logo.png" alt="" /></span>
        <span class="brand-copy"><strong>学生骨干<br />应急信息服务</strong><small>快速查找 · 准确上报 · 有序协同</small></span>
      </RouterLink>
      <nav class="side-nav" aria-label="主要导航">
        <RouterLink to="/contacts">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-3 2a15 15 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2C9.7 21 3 14.3 3 6a2 2 0 0 1 2-2Z"/></svg>
          <span><strong>紧急联络人</strong><small>查找角色与联络要点</small></span>
        </RouterLink>
        <RouterLink to="/campus-map">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/></svg>
          <span><strong>校园地图</strong><small>确认校区与常用位置</small></span>
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
      <footer class="site-footer"><span>南开大学学生骨干应急信息服务</span><span>本站信息仅作应急参考 · 以学校官方通知为准</span></footer>
    </main>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { navigationItems } from './data/navigation'
import { useMobileMenu } from './composables/useMobileMenu'
import { useVisitCount } from './composables/useVisitCount'

const { menuOpen, menuButton, sidebar, mainContent, closeMenu, onNavigationClick } = useMobileMenu()
const { formattedVisitCount, visitCountStatus } = useVisitCount()
const showIntro = ref(true)
let introTimer

onMounted(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  introTimer = window.setTimeout(() => { showIntro.value = false }, reducedMotion ? 100 : 650)
})

onBeforeUnmount(() => window.clearTimeout(introTimer))
</script>

<template>
  <Transition name="intro">
    <div v-if="showIntro" class="intro-screen" role="status" aria-label="南开大学校徽与校训入场动画">
      <div class="intro-glow" aria-hidden="true"></div>
      <div class="intro-identity">
        <div class="intro-emblem"><img src="/images/nankai-university-logo.png" alt="南开大学校徽" /></div>
        <div class="intro-rule" aria-hidden="true"><i></i></div>
        <p class="intro-motto">允公允能&nbsp;&nbsp;日新月异</p>
        <span>南开大学 · 校园生活指北</span>
      </div>
    </div>
  </Transition>
  <div class="app-shell">
    <header class="mobile-header" @click.capture="onNavigationClick">
      <RouterLink class="mobile-brand" to="/" aria-label="返回首页"><span class="brand-mark logo-mark"><img src="/images/nankai-university-logo.png" alt="" /></span><span>南开校园指北</span></RouterLink>
      <button ref="menuButton" class="menu-button" type="button" :aria-expanded="menuOpen" aria-controls="site-sidebar" @click="menuOpen = !menuOpen">
        <span class="sr-only">{{ menuOpen ? '关闭导航菜单' : '打开导航菜单' }}</span><span></span><span></span><span></span>
      </button>
    </header>
    <div v-if="menuOpen" class="menu-backdrop" aria-hidden="true" @click="closeMenu()"></div>
    <aside ref="sidebar" id="site-sidebar" class="sidebar" :class="{ open: menuOpen }">
      <RouterLink class="brand" to="/" aria-label="南开校园生活指北首页">
        <span class="brand-mark logo-mark"><img src="/images/nankai-university-logo.png" alt="" /></span>
        <span class="brand-copy"><strong>南开校园<br />生活指北</strong><small>找路 · 办事 · 安心生活</small></span>
      </RouterLink>
      <nav class="side-nav" aria-label="主要导航" @click.capture="onNavigationClick">
        <RouterLink v-for="item in navigationItems" :key="item.to" :to="item.to">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path v-for="path in item.paths" :key="path" :d="path" /></svg>
          <span><strong>{{ item.title }}</strong><small>{{ item.subtitle }}</small></span>
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
    <main ref="mainContent" class="main-content" tabindex="-1" :inert="menuOpen || undefined" :aria-hidden="menuOpen ? true : undefined">
      <RouterView />
      <footer class="site-footer"><span>南开大学校园生活指北</span><span>实用信息持续更新 · 重要事项以学校官方通知为准</span></footer>
    </main>
  </div>
</template>

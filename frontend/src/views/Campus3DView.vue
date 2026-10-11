<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const frameLoaded = ref(false)
const scene = ref(null)
const fullscreen = ref(false)
const pageFullscreen = ref(false)
let previousOverflow = ''
function syncFullscreen() {
  fullscreen.value = document.fullscreenElement === scene.value || pageFullscreen.value
}
function setPageFullscreen(value) {
  pageFullscreen.value = value
  if (value) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = previousOverflow
  }
  syncFullscreen()
}
async function toggleFullscreen() {
  if (pageFullscreen.value) return setPageFullscreen(false)
  if (document.fullscreenElement === scene.value) {
    await document.exitFullscreen()
    return
  }
  try {
    if (!scene.value.requestFullscreen) throw new Error('Fullscreen unavailable')
    await scene.value.requestFullscreen()
  } catch {
    setPageFullscreen(true)
  }
}
function onEscape(event) {
  if (event.key === 'Escape' && pageFullscreen.value) setPageFullscreen(false)
}
onMounted(() => {
  document.addEventListener('fullscreenchange', syncFullscreen)
  window.addEventListener('keydown', onEscape)
})
onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', syncFullscreen)
  window.removeEventListener('keydown', onEscape)
  if (pageFullscreen.value) setPageFullscreen(false)
})
// The scene selects its touch controls and rendering quality for the device.
const sceneUrl = '/campus-3d-assets/index.html'
</script>

<template>
  <div class="page inner-page campus-3d-page">
    <header class="page-header campus-3d-heading">
      <div>
        <span class="section-kicker"><i></i> 3D CAMPUS</span>
        <h1>3D 校园地图</h1>
        <p>走进津南校区三维场景，探索校园道路、建筑与地标。</p>
      </div>
      <a class="campus-3d-open" :href="sceneUrl" target="_blank" rel="noopener">独立打开地图 ↗</a>
    </header>

    <section ref="scene" class="campus-3d-scene" :class="{ 'is-page-fullscreen': pageFullscreen }" aria-label="津南校区 3D 地图">
      <button class="campus-3d-fullscreen" :aria-pressed="fullscreen" @click="toggleFullscreen">{{ fullscreen ? '退出全屏 ⤡' : '全屏 ⤢' }}</button>
      <p v-if="!frameLoaded" class="campus-3d-loading" role="status">正在打开 3D 地图…</p>
      <iframe
        :src="sceneUrl"
        title="南开大学津南校区 3D 互动地图"
        allow="autoplay; fullscreen"
        allowfullscreen
        @load="frameLoaded = true"
      ></iframe>
    </section>

    <div class="campus-3d-help">
      <p><strong>电脑：</strong>点击场景后使用 WASD 移动，C 切换步行，E 骑车；拖动鼠标环视，滚轮缩放。</p>
      <p><strong>手机：</strong>使用屏幕摇杆与操作按钮，横屏或独立打开可获得更大的探索空间。</p>
      <p>当前提供津南校区三维探索场景。建筑与道路为建模展示，实际出行请使用“校园地图 · NK 智行”。</p>
    </div>
  </div>
</template>

<style scoped>
.campus-3d-page { display: grid; gap: 1.25rem; min-width: 0; }
.campus-3d-heading { display: flex; align-items: center; justify-content: space-between; gap: 1.25rem; margin-bottom: 0; }
.campus-3d-open { display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; min-height: 44px; padding: .75rem 1rem; background: #7e0c6e; color: white; text-decoration: none; font-weight: 700; }
.campus-3d-open:focus-visible { outline: 3px solid #7e0c6e; outline-offset: 4px; }
.campus-3d-scene { position: relative; overflow: hidden; background: #101923; border: 1px solid #d8c5d5; height: clamp(540px, 74dvh, 900px); }
.campus-3d-scene iframe { display: block; width: 100%; height: calc(100% - 52px - env(safe-area-inset-top)); margin-top: calc(52px + env(safe-area-inset-top)); border: 0; }
.campus-3d-fullscreen { position: absolute; z-index: 2; top: calc(4px + env(safe-area-inset-top)); right: 10px; min-height: 44px; padding: .5rem .85rem; border: 1px solid #ffffff80; border-radius: 8px; background: #400839e6; color: white; cursor: pointer; font-weight: 700; }
.campus-3d-fullscreen:focus-visible { outline: 3px solid white; outline-offset: 2px; }
.campus-3d-scene:fullscreen, .campus-3d-scene.is-page-fullscreen { width: 100%; height: 100dvh; min-height: 0; border: 0; }
.campus-3d-scene.is-page-fullscreen { position: fixed; inset: 0; z-index: 10000; }
.campus-3d-loading { position: absolute; inset: 0; display: grid; place-items: center; margin: 0; color: white; pointer-events: none; }
.campus-3d-help { padding: 1rem 1.25rem; background: #f7eff6; border-left: 3px solid #7e0c6e; }
.campus-3d-help p { margin: .4rem 0; line-height: 1.65; }
@media (max-width: 700px) {
  .campus-3d-heading { align-items: flex-start; flex-direction: column; }
  .campus-3d-scene { height: 78dvh; min-height: 540px; }
}
@media (max-height: 500px) and (orientation: landscape) {
  .campus-3d-scene { height: 90dvh; min-height: 320px; }
}
</style>

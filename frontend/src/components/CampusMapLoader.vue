<script setup>
const props = defineProps({
  mode: { type: String, default: 'online' },
  fullscreen: { type: Boolean, default: false },
})
</script>

<template>
  <div class="campus-3d-loader" :class="{ 'is-fullscreen': props.fullscreen }" role="status" aria-live="polite">
    <div class="loader-glow" aria-hidden="true"></div>
    <div class="loader-stage" aria-hidden="true">
      <div class="nankai-medallion">
        <img class="medallion-face medallion-front" src="/images/nankai-university-logo.png" alt="">
        <img class="medallion-face medallion-back" src="/images/nankai-university-logo.png" alt="">
      </div>

      <div class="popup-campus">
        <div class="campus-page">
          <span class="campus-axis"></span>
          <span class="campus-path path-left"></span>
          <span class="campus-path path-right"></span>
        </div>

        <div class="library-model">
          <div class="library-shadow"></div>
          <div class="library-side library-side-left"></div>
          <div class="library-side library-side-right"></div>
          <div class="library-main">
            <div class="library-crown">
              <div class="library-top-windows"></div>
            </div>
            <div class="library-crown-shadow"></div>
            <div class="library-wings library-wing-left"></div>
            <div class="library-wings library-wing-right"></div>
            <div class="library-center">
              <img class="library-seal" src="/images/nankai-university-logo.png" alt="">
            </div>
            <div class="library-ground-floor"></div>
            <div class="library-entrance">
              <i></i><i></i><i></i><i></i><i></i>
            </div>
            <div class="library-terrace library-terrace-left"></div>
            <div class="library-terrace library-terrace-right"></div>
            <div class="library-stairs"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="loader-copy">
      <strong>{{ props.fullscreen ? '允公允能 · 日新月异' : '南开智行·校园导航' }}</strong>
      <span>{{ props.fullscreen ? '南开大学津南校区正在展开' : `正在展开${props.mode === 'online' ? '在线校园地图' : '校园导览图'}` }}</span>
      <i class="loader-progress" aria-hidden="true"></i>
    </div>
    <span class="sr-only">{{ props.fullscreen ? '南开大学校园生活指北正在加载' : `正在加载${props.mode === 'online' ? '在线底图' : '校园导览图'}…` }}</span>
  </div>
</template>

<style scoped>
.campus-3d-loader {
  position: absolute;
  inset: 0;
  z-index: 820;
  display: grid;
  place-content: center;
  justify-items: center;
  overflow: hidden;
  color: #fff;
  background:
    radial-gradient(circle at 50% 48%, rgba(190, 101, 164, .28), transparent 35%),
    linear-gradient(145deg, #24071f 0%, #4b0b40 54%, #180416 100%);
  isolation: isolate;
}

.campus-3d-loader.is-fullscreen {
  position: fixed;
  z-index: 10000;
}

.loader-glow {
  position: absolute;
  left: 50%;
  top: 53%;
  width: min(68vw, 580px);
  aspect-ratio: 2.6;
  border-radius: 50%;
  background: rgba(255, 221, 171, .18);
  filter: blur(34px);
  transform: translate(-50%, -50%);
}

.loader-stage {
  position: relative;
  width: clamp(260px, 52vw, 560px);
  height: clamp(178px, 30vw, 310px);
  perspective: 900px;
  transform-style: preserve-3d;
}

.nankai-medallion {
  position: absolute;
  z-index: 8;
  left: 50%;
  top: 2%;
  width: clamp(50px, 8.2vw, 82px);
  aspect-ratio: 1;
  transform-style: preserve-3d;
  animation: medallion-arrive 3.4s cubic-bezier(.2,.72,.22,1) infinite;
}

.nankai-medallion::after {
  content: '';
  position: absolute;
  inset: 5%;
  border: 3px solid #d7ae67;
  border-radius: 50%;
  box-shadow: 0 0 0 3px #7e0c6e, 0 10px 24px rgba(0, 0, 0, .34);
  transform: translateZ(-2px);
}

.medallion-face {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: contain;
  background: #fff;
  backface-visibility: hidden;
}

.medallion-back { transform: rotateY(180deg); }

.popup-campus {
  position: absolute;
  left: 50%;
  bottom: 3%;
  width: 88%;
  height: 72%;
  transform: translateX(-50%) rotateX(59deg) rotateZ(-1deg);
  transform-style: preserve-3d;
}

.campus-page {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border: 1px solid rgba(225, 188, 126, .7);
  border-radius: 5px;
  background:
    linear-gradient(90deg, transparent 49.6%, rgba(126, 12, 110, .26) 49.8%, rgba(126, 12, 110, .26) 50.2%, transparent 50.4%),
    linear-gradient(135deg, #fffaf0, #ead8ba);
  box-shadow: 0 32px 35px rgba(0, 0, 0, .38);
  transform-origin: center bottom;
  animation: unfold-page 3.4s cubic-bezier(.2,.72,.22,1) infinite;
}

.campus-page::before,
.campus-page::after {
  content: '';
  position: absolute;
  width: 44%;
  height: 36%;
  border: 8px double rgba(126, 12, 110, .12);
  border-radius: 50%;
}

.campus-page::before { left: -12%; top: 13%; }
.campus-page::after { right: -13%; bottom: 8%; }

.campus-axis,
.campus-path {
  position: absolute;
  background: rgba(126, 12, 110, .18);
}

.campus-axis { left: 49.6%; top: 4%; width: .8%; height: 92%; }
.campus-path { top: 68%; width: 38%; height: 5px; }
.path-left { left: 8%; transform: rotate(10deg); }
.path-right { right: 8%; transform: rotate(-10deg); }

.library-model {
  position: absolute;
  left: 50%;
  bottom: 22%;
  width: 82%;
  height: 73%;
  transform: translateX(-50%) rotateX(-59deg) translateZ(1px);
  transform-origin: center bottom;
  transform-style: preserve-3d;
  animation: raise-library 3.4s cubic-bezier(.12,.72,.18,1) infinite;
}

.library-shadow {
  position: absolute;
  left: 7%;
  right: 7%;
  bottom: -3%;
  height: 20%;
  border-radius: 50%;
  background: rgba(25, 2, 21, .45);
  filter: blur(11px);
  transform: rotateX(72deg) translateZ(-12px);
}

.library-main {
  position: absolute;
  inset: 2% 2% 0;
  overflow: visible;
  filter: drop-shadow(0 9px 10px rgba(25, 2, 21, .35));
  transform: translateZ(4px);
}

.library-crown {
  position: absolute;
  z-index: 5;
  left: 13%;
  right: 13%;
  top: 0;
  height: 29%;
  padding: 2.5% 8% 5%;
  border: 1px solid #d8c7ad;
  background: linear-gradient(172deg, #f3ebdc 0 33%, #cbbba5 34% 45%, #eee4d3 46% 100%);
  clip-path: polygon(8% 0, 92% 0, 100% 76%, 95% 100%, 5% 100%, 0 76%);
  box-sizing: border-box;
}

.library-top-windows {
  width: 100%;
  height: 69%;
  margin-top: 2%;
  border: 3px solid #b7a68f;
  background: repeating-linear-gradient(90deg, #29404e 0 3.4%, #d5c9b7 3.4% 4.8%);
  box-shadow: inset 0 3px 0 rgba(255,255,255,.18);
}

.library-crown-shadow {
  position: absolute;
  z-index: 2;
  left: 10%;
  right: 10%;
  top: 26%;
  height: 7%;
  background: linear-gradient(#57303b, #291923);
  clip-path: polygon(3% 0, 97% 0, 100% 100%, 0 100%);
}

.library-center {
  position: absolute;
  z-index: 3;
  left: 35.5%;
  right: 35.5%;
  top: 31%;
  bottom: 15%;
  display: grid;
  place-items: center;
  border-inline: 3px solid #4c2430;
  background: linear-gradient(90deg, #8b3542, #a84d54 50%, #84323f);
}

.library-seal {
  width: clamp(22px, 3.6vw, 38px);
  aspect-ratio: 1;
  border-radius: 50%;
  object-fit: contain;
  opacity: .72;
  filter: sepia(1) saturate(.42) contrast(1.25) brightness(.72);
}

.library-wings {
  position: absolute;
  top: 32%;
  bottom: 16%;
  width: 34%;
  border-top: 3px solid #c2a596;
  background: repeating-linear-gradient(90deg, #7b303e 0 3%, #a94d55 3% 5.5%, #342936 5.5% 7.5%);
}

.library-wing-left { left: 1%; }
.library-wing-right { right: 1%; }

.library-ground-floor {
  position: absolute;
  z-index: 2;
  left: 2%;
  right: 2%;
  bottom: 5%;
  height: 13%;
  border-block: 3px solid #dfd0ba;
  background: repeating-linear-gradient(90deg, #c7b69e 0 1.8%, #263844 1.8% 5%);
}

.library-entrance {
  position: absolute;
  z-index: 4;
  left: 38%;
  right: 38%;
  bottom: 4%;
  height: 18%;
  display: flex;
  justify-content: space-around;
  border: 4px solid #ddc5a7;
  border-bottom: 0;
  background: linear-gradient(rgba(29, 46, 59, .92), rgba(18, 28, 36, .95));
}

.library-entrance i { width: 5px; height: 118%; background: #d9cab7; }

.library-terrace {
  position: absolute;
  z-index: 6;
  bottom: -4%;
  width: 30%;
  height: 12%;
  border: 3px solid #ded3c1;
  background: linear-gradient(#657d45 0 32%, #bfb8a8 34% 100%);
  transform: perspective(90px) rotateX(48deg);
}

.library-terrace-left { left: 7%; }
.library-terrace-right { right: 7%; }

.library-stairs {
  position: absolute;
  z-index: 7;
  left: 30%;
  right: 30%;
  bottom: -12%;
  height: 17%;
  border-inline: 1px solid rgba(103, 73, 67, .42);
  background: repeating-linear-gradient(0deg, #d7cdbd 0 8%, #ad9e8c 8% 12%);
  clip-path: polygon(12% 0, 88% 0, 100% 100%, 0 100%);
  transform: perspective(110px) rotateX(53deg);
  transform-origin: top;
}

.library-side {
  position: absolute;
  z-index: -1;
  bottom: 1%;
  width: 15%;
  height: 65%;
  background: repeating-linear-gradient(0deg, #6c2b38 0 5%, #a55257 5% 8%);
}

.library-side-left { left: -1%; transform: rotateY(-61deg); transform-origin: right; }
.library-side-right { right: -1%; transform: rotateY(61deg); transform-origin: left; }

.loader-copy {
  position: relative;
  z-index: 10;
  display: grid;
  justify-items: center;
  gap: 5px;
  margin-top: -4px;
  text-align: center;
  letter-spacing: .12em;
}

.loader-copy strong {
  font-family: Georgia, 'Songti SC', serif;
  font-size: clamp(14px, 2vw, 21px);
  font-weight: 600;
}

.loader-copy span { color: rgba(255,255,255,.72); font-size: clamp(9px, 1.1vw, 12px); }

.loader-progress {
  position: relative;
  width: clamp(120px, 22vw, 220px);
  height: 2px;
  margin-top: 7px;
  overflow: hidden;
  background: rgba(255,255,255,.18);
}

.loader-progress::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, #e1bd78, transparent);
  animation: loader-progress 1.5s ease-in-out infinite;
}

@keyframes medallion-arrive {
  0% { opacity: 0; transform: translate(-50%, -18px) rotateY(0deg) scale(.7); }
  16% { opacity: 1; transform: translate(-50%, 0) rotateY(180deg) scale(1); }
  48%, 76% { opacity: 1; transform: translate(-50%, 2px) rotateY(540deg) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -5px) rotateY(720deg) scale(.82); }
}

@keyframes unfold-page {
  0%, 12% { opacity: 0; transform: scaleX(.05) rotateX(30deg); }
  38%, 82% { opacity: 1; transform: scaleX(1) rotateX(0); }
  100% { opacity: 0; transform: scaleX(.96) rotateX(0); }
}

@keyframes raise-library {
  0%, 30% { opacity: 0; transform: translateX(-50%) rotateX(-59deg) translateZ(1px) scaleY(.02); }
  58%, 84% { opacity: 1; transform: translateX(-50%) rotateX(-59deg) translateZ(1px) scaleY(1); }
  100% { opacity: 0; transform: translateX(-50%) rotateX(-59deg) translateZ(1px) scaleY(.98); }
}

@keyframes loader-progress {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}

@media (max-width: 600px) {
  .loader-stage { width: min(92vw, 430px); height: min(58vw, 245px); }
  .popup-campus { width: 94%; }
  .nankai-medallion { top: -2%; }
  .loader-copy { margin-top: 4px; }
}

@media (prefers-reduced-motion: reduce) {
  .nankai-medallion,
  .campus-page,
  .library-model,
  .loader-progress::after {
    animation: none;
  }

  .nankai-medallion { opacity: 1; transform: translateX(-50%) rotateY(12deg); }
  .campus-page { opacity: 1; transform: none; }
  .library-model { opacity: 1; transform: translateX(-50%) rotateX(-59deg) translateZ(1px); }
}
</style>

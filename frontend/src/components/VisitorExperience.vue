<script setup>
defineProps({ campus: { type: String, required: true } })
defineEmits(['question', 'exit'])
const scenes = {
  jinnan: [
    { title: '从校门去图书馆', start: '津南西南门', question: '从津南西南门步行去中心图书馆怎么走？' },
    { title: '认识校园地标', start: '地点讲解', question: '介绍一下津南校区中心图书馆。' },
  ],
  balitai: [
    { title: '从校门去主楼', start: '八里台东门', question: '从八里台东门步行去主楼怎么走？' },
    { title: '听一段南开故事', start: '地点讲解', question: '介绍一下思源堂。' },
  ],
}
</script>

<template>
  <section class="visitor-experience" aria-labelledby="visitor-title">
    <div class="visitor-heading"><div><span class="section-kicker">校外也能体验</span><h2 id="visitor-title">以访客身份，走进南开</h2></div><button type="button" @click="$emit('exit')">退出体验</button></div>
    <p role="status">当前为校外体验：路线使用下方预设起点，不代表你的真实位置，无需授权定位。问答与道路规划仍调用真实服务。</p>
    <ol class="visitor-steps"><li>选择下方场景</li><li>检查或修改问题，点击“开始规划”</li><li>在地图查看路线，点击地点查看实景与介绍</li></ol>
    <div class="visitor-scenes">
      <button v-for="scene in scenes[campus]" :key="scene.title" type="button" @click="$emit('question', scene.question)"><strong>{{ scene.title }}</strong><span>{{ scene.start === '地点讲解' ? scene.start : `演示起点：${scene.start}` }}</span><span>{{ scene.question }} →</span></button>
      <button type="button" @click="$emit('question', '这是安全协助演示场景：我晚上一个人在学校迷路，有些害怕，应该怎么办？')"><strong>体验安全协助</strong><span>演示情境 · 无需定位</span><span>查看安全建议与求助渠道 →</span></button>
    </div>
    <p class="visitor-links"><RouterLink v-if="campus === 'jinnan'" to="/campus-3d">进入津南 3D 校园探索 →</RouterLink><RouterLink to="/contacts">查看紧急联络 →</RouterLink></p>
    <p class="visitor-note">实时移动、到达提醒与偏航重规划需在校内实测。本体验不模拟真实 GPS；路线服务失败时请按提示重试，也可继续查看校园地点与介绍。</p>
  </section>
</template>

<style scoped>
.visitor-experience { padding: clamp(16px, 3vw, 28px); border: 1px solid #d8c5d5; background: #f7eff6; margin-bottom: 24px; }
.visitor-heading { display:flex; justify-content:space-between; gap:16px; align-items:center; flex-wrap:wrap; }
h2 { margin:8px 0; }
p, li { line-height:1.7; }
button { min-height:44px; cursor:pointer; color:#5f1155; border:1px solid #c9aec5; background:white; padding:12px 16px; border-radius:8px; font:inherit; }
button:focus-visible, a:focus-visible { outline:3px solid #7e0c6e; outline-offset:3px; }
.visitor-scenes { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
.visitor-scenes button { display:grid; gap:10px; text-align:left; overflow-wrap:anywhere; }
.visitor-scenes button:hover { border-color:#7e0c6e; }
.visitor-scenes span, .visitor-note { font-size:.9rem; }
.visitor-links { display:flex; gap:20px; flex-wrap:wrap; }
a { color:#751067; }
@media(max-width:700px) { .visitor-scenes { grid-template-columns:1fr; } }
</style>

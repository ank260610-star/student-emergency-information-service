<script setup>
const links = [
  { name: '南开教务', category: '教学服务', url: 'https://eamis.nankai.edu.cn/' },
  { name: '智慧树在线平台', category: '在线学习', url: 'https://nankaiweb.zhihuishu.com/' },
  { name: '学习通', category: '在线学习', url: 'https://v8.chaoxing.com/' },
  { name: '仿真实验', category: '教学服务', url: 'https://msecc.nankai.edu.cn/' },
  { name: '体育理论在线考试', category: '考试服务', url: 'http://tyxxx.nankai.edu.cn/' },
  { name: '四六级', category: '考试报名', url: 'https://cet-bm.neea.edu.cn/' },
  { name: '电子成绩单', category: '证明服务', url: 'http://dzpz.nankai.edu.cn/' },
  { name: '学生电子证明', category: '证明服务', url: 'https://dzbz.nankai.edu.cn/' },
  { name: '南开大学信息门户', category: '校园服务', url: 'https://i.nankai.edu.cn/' },
  { name: '校园 VPN', category: '网络服务', url: 'https://www.nankai.edu.cn/vpn/list.psp' },
  { name: '南开大学图书馆', category: '校园服务', url: 'https://lib.nankai.edu.cn/' },
  { name: '学生工作网', category: '学生工作', url: 'https://xgb.nankai.edu.cn/' },
  { name: '南开大学官网', category: '学校门户', url: 'https://www.nankai.edu.cn/' },
  { name: '南开飞书', category: '协同办公', url: 'https://www.feishu.cn/customers/nku' },
  { name: '智慧团建', category: '团学服务', url: 'https://zhtj.youth.cn/zhtj/' },
  { name: '南开大学团委成长服务平台', category: '团学服务', url: 'http://czfw.nankai.edu.cn/' },
  { name: '志愿服务', category: '团学服务', url: 'https://zyfw.nankai.edu.cn/' },
  { name: '社会实践', category: '实践服务', url: 'http://shsj.nankai.edu.cn/' },
  { name: '公能实践', category: '实践服务', url: 'http://fuxue.nankai.edu.cn/' },
]

const hostname = (url) => new URL(url).hostname
</script>

<template>
  <div class="page inner-page common-links-page">
    <header class="page-header">
      <span class="section-kicker"><i></i> USEFUL LINKS</span>
      <h1>常用链接</h1>
      <p>汇总学习考试、校园服务、团学实践等常用入口。点击卡片将在新标签页打开对应网站。</p>
    </header>

    <section aria-labelledby="links-title">
      <div class="section-heading compact">
        <span class="section-kicker"><i></i> 快速入口</span>
        <h2 id="links-title">19 个校园服务入口</h2>
      </div>
      <div class="common-link-grid">
        <a v-for="(item, index) in links" :key="item.name" class="common-link-card" :href="item.url" target="_blank" rel="noopener noreferrer">
          <span class="common-link-number" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="common-link-copy">
            <small>{{ item.category }}</small>
            <strong>{{ item.name }}</strong>
            <span>{{ hostname(item.url) }}</span>
          </span>
          <b aria-hidden="true">↗</b>
        </a>
      </div>
    </section>

    <aside class="common-links-note">
      <span aria-hidden="true">!</span>
      <p>部分系统可能要求统一身份认证、校园网络或指定开放时间；如页面无法访问，请以对应部门最新通知为准。</p>
    </aside>
  </div>
</template>

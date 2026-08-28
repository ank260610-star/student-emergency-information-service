<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

const activeCampus = ref('jinnan')
const expanded = ref(new Set(['online']))
const toggle = (id) => {
  const next = new Set(expanded.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expanded.value = next
}
const isOpen = (id) => expanded.value.has(id)
</script>

<template>
  <div class="page inner-page guide-page">
    <header class="page-header guide-header">
      <span class="section-kicker"><i></i> 2026 ORIENTATION GUIDE</span>
      <h1>新生报到时间轴</h1>
      <p>从线上预报到、进入校园到安顿宿舍，把第一次到南开的每一步拆成可以照着做的行动清单。</p>
      <div class="priority-note"><span>!</span><strong>现场报到日期、学院报到点和接站安排以录取通知书、南开飞书及学院最新通知为准。</strong></div>
    </header>

    <section class="official-status" aria-label="2026年信息状态">
      <div><small>已由学校公布</small><strong>网上报到：8月12日 09:00—8月14日 17:00</strong></div>
      <div><small>到校前必须确认</small><strong>本人校区、现场日期、学院迎新点与宿舍楼</strong></div>
      <a href="https://yx.nankai.edu.cn/onlineReg/undergraduate/index.html" target="_blank" rel="noopener">进入南开大学新生服务网 →</a>
    </section>

    <section class="campus-guide-switch" aria-labelledby="campus-guide-title">
      <div class="section-heading compact"><span class="section-kicker"><i></i> 双校区指引</span><h2 id="campus-guide-title">先确认你要去的校区</h2></div>
      <div class="campus-tabs" role="tablist" aria-label="报到校区切换">
        <button :class="{ active: activeCampus === 'jinnan' }" :aria-selected="activeCampus === 'jinnan'" role="tab" @click="activeCampus = 'jinnan'">津南校区</button>
        <button :class="{ active: activeCampus === 'balitai' }" :aria-selected="activeCampus === 'balitai'" role="tab" @click="activeCampus = 'balitai'">八里台校区</button>
      </div>
      <div class="campus-guide-panel" role="tabpanel">
        <template v-if="activeCampus === 'jinnan'">
          <strong>津南校区｜天津海河教育园区同砚路 38 号</strong>
          <p>校区范围较大。下车前截好学院迎新点和宿舍楼定位；校园卡、网络和购电线下服务集中在<strong>综合业务西楼师生服务大厅</strong>。</p>
        </template>
        <template v-else>
          <strong>八里台校区｜天津市南开区卫津路 94 号</strong>
          <p>楼宇密集且校门较多。导航时写清具体校门；校园卡与网络线下服务位于<strong>服务楼 103/104 室</strong>，宿舍购电需区分照明与空调电表。</p>
        </template>
      </div>
    </section>

    <section class="orientation-timeline" aria-labelledby="timeline-title">
      <div class="section-heading compact"><span class="section-kicker"><i></i> 按顺序完成</span><h2 id="timeline-title">从出发前到报到后第一周</h2></div>

      <article id="step-online" class="timeline-step" :class="{ open: isOpen('online') }">
        <div class="timeline-node"><span>00</span><small>出发前</small></div>
        <div class="timeline-card">
          <button class="timeline-trigger" :aria-expanded="isOpen('online')" aria-controls="detail-online" @click="toggle('online')"><span><small>2026 官方流程</small><strong>先完成网上报到</strong><em>查询学号 → 激活统一身份 → 激活飞书 → 问卷 → 信息采集</em></span><b>{{ isOpen('online') ? '收起' : '展开' }}</b></button>
          <div v-show="isOpen('online')" id="detail-online" class="timeline-detail">
            <ol class="action-list"><li><strong>查询学号：</strong>姓名必填，通知书号或身份证号二选一；学号同时是统一身份、一卡通和信息门户账号。</li><li><strong>激活统一身份：</strong>前往 <a href="https://iam.nankai.edu.cn/activation" target="_blank" rel="noopener">统一身份激活页</a> 设置密码，再登录新生服务网。</li><li><strong>激活南开飞书：</strong>飞书选择 SSO 登录，企业域名填 <code>nankai</code>，使用学号与统一身份密码登录。</li><li><strong>完成信息：</strong>依次提交调查问卷、学生信息采集表；提交前逐项复核，提交后可能无法修改。</li></ol>
            <p class="help-line">卡住时：迎新服务咨询 022-23509409。请勿把验证码或统一身份密码发给“新生群管理员”。</p>
          </div>
        </div>
      </article>

      <article id="step-welcome" class="timeline-step" :class="{ open: isOpen('welcome') }">
        <div class="timeline-node"><span>01</span><small>接站</small></div>
        <div class="timeline-card">
          <button class="timeline-trigger" :aria-expanded="isOpen('welcome')" aria-controls="detail-welcome" @click="toggle('welcome')"><span><small>迎新志愿服务</small><strong>先确认接站与引导安排</strong><em>接站预约 → 志愿者引导 → 抵达对应校区</em></span><b>{{ isOpen('welcome') ? '收起' : '展开' }}</b></button>
          <div v-show="isOpen('welcome')" id="detail-welcome" class="timeline-detail">
            <div class="dynamic-notice"><strong>2026 接站时间：8 月 29 日（周六）07:00—21:00</strong><p>出发前登录飞书，在“南开微应用 → 迎新服务”填写接站调查并预约；下车后只跟随带有南开迎新标识的志愿者。</p></div>
            <div class="welcome-stations" aria-label="迎新接站地点">
              <div><small>天津站</small><strong>南广场公交站</strong><p>从南四出口离站</p></div>
              <div><small>天津西站</small><strong>北广场公交站</strong><p>志愿者在南出站口引导</p></div>
              <div><small>天津南站</small><strong>西广场</strong><p>志愿者在出站口引导</p></div>
              <div><small>滨海国际机场</small><strong>停车场交通中心 A 岛</strong><p>从机场大厅 7 号出口直行</p></div>
            </div>
            <div class="detail-grid"><div><h4>校内集中服务咨询点</h4><ul><li><strong>八里台：</strong>书画艺术与美学研究中心草坪前。</li><li><strong>津南文科组团：</strong>周恩来政府管理学院、社会学院与历史学院中间。</li><li><strong>津南理科组团：</strong>理科 5B、5C 宿舍楼前空地。</li></ul></div><div><h4>可以向志愿者求助</h4><ul><li>确认接驳车辆前往八里台还是津南，避免坐错校区。</li><li>询问学院报到点、宿舍楼和食堂路线。</li><li>行动不便或行李过多时请求现场协助；不要把身份证和手机交给他人代为保管。</li></ul></div></div>
          </div>
        </div>
      </article>

      <article id="step-enter" class="timeline-step" :class="{ open: isOpen('enter') }">
        <div class="timeline-node"><span>02</span><small>进校</small></div>
        <div class="timeline-card">
          <button class="timeline-trigger" :aria-expanded="isOpen('enter')" aria-controls="detail-enter" @click="toggle('enter')"><span><small>抵达校门</small><strong>找到官方接待点</strong><em>校区、校门、学院、宿舍楼四项信息先核对</em></span><b>{{ isOpen('enter') ? '收起' : '展开' }}</b></button>
          <div v-show="isOpen('enter')" id="detail-enter" class="timeline-detail"><div class="detail-grid"><div><h4>到门口怎么做</h4><ul><li>打开南开飞书中的最新迎新通知，向佩戴证件的工作人员报学院和姓名。</li><li>自行报到需凭身份证入校；自驾车辆按现场交通安排即停即走，证件、手机和材料包不要留在车上。</li><li>找不到路时发送“校区 + 校门 + 附近建筑”，不要只说“我在南开”。</li></ul></div><div><h4>{{ activeCampus === 'jinnan' ? '津南入校口' : '八里台入校口' }}</h4><p v-if="activeCampus === 'jinnan'">可从西门、西北门、东门刷身份证入校；乘坐地铁的新生可从西南门刷身份证入校。各门距离较远，导航时必须写清具体校门。</p><p v-else>可从东门或西门刷身份证入校。卫津路、复康路一带校门较多，西南村生活区与校内宿舍也不要混淆。</p></div></div></div>
        </div>
      </article>

      <article id="step-materials" class="timeline-step" :class="{ open: isOpen('materials') }">
        <div class="timeline-node"><span>03</span><small>材料</small></div>
        <div class="timeline-card">
          <button class="timeline-trigger" :aria-expanded="isOpen('materials')" aria-controls="detail-materials" @click="toggle('materials')"><span><small>学院迎新点</small><strong>身份核验与材料提交</strong><em>先核验，再领取校园卡、宿舍信息等物品</em></span><b>{{ isOpen('materials') ? '收起' : '展开' }}</b></button>
          <div v-show="isOpen('materials')" id="detail-materials" class="timeline-detail"><div class="materials-board"><div><h4>放进随身材料袋</h4><ul class="check-list"><li>录取通知书原件</li><li>居民身份证原件及复印件</li><li>高考准考证（建议携带）</li><li>近期免冠一寸彩照（建议 4—6 张）</li><li>学院另行要求的表格或证明</li></ul></div><div><h4>按个人情况准备</h4><ul><li>纸质学生档案：仅在当地要求本人自带时携带，保持密封，勿自行拆封。</li><li>党团组织关系、户口迁移材料：是否办理及提交方式看随通知书寄送的说明。</li><li>生源地贷款或家庭经济困难材料：前往现场“绿色通道”，不必因缴费问题放弃报到。</li></ul></div></div><p class="evidence-note"><strong>为什么不能只看网络清单：</strong>学校 2026 招生章程明确会核对录取通知、考生信息等证明材料；本科生具体份数和附加材料仍由录取材料及学院通知确定。复印件与照片多带几份能减少现场往返。</p></div>
        </div>
      </article>

      <article id="step-card" class="timeline-step" :class="{ open: isOpen('card') }">
        <div class="timeline-node"><span>04</span><small>联网</small></div>
        <div class="timeline-card">
          <button class="timeline-trigger" :aria-expanded="isOpen('card')" aria-controls="detail-card" @click="toggle('card')"><span><small>校园卡与校园网</small><strong>先联网，再绑定与充值</strong><em>NKU_WLAN → 统一身份登录 → 南开大学一卡通</em></span><b>{{ isOpen('card') ? '收起' : '展开' }}</b></button>
          <div v-show="isOpen('card')" id="detail-card" class="timeline-detail"><ol class="action-list"><li><strong>连接校园网：</strong>选择无线网络 <code>NKU_WLAN</code>，打开任意网页进入认证页；用户名为学号，初始密码为证件号后 6 位（字母大写）。</li><li><strong>领取校园卡：</strong>普通新生卡由学校统一预制，通常在报到点免费领取。现场先核对姓名与学号。</li><li><strong>绑定微信：</strong>微信搜索并关注“南开大学一卡通”，选择“校园卡 → 校园卡绑定”，通过统一身份认证。</li><li><strong>充值：</strong>公众号选择“卡片充值”。充值先进入过渡余额，第一次到食堂消费时需在 POS 机上刷实体卡，将金额写入卡内。</li></ol><div class="service-points"><div><small>津南线下服务</small><strong>综合业务西楼师生服务大厅 16—17 窗口</strong></div><div><small>八里台线下服务</small><strong>服务楼 103（网络）/ 104（校园卡）</strong></div></div><div class="link-row"><a href="https://wxb.nankai.edu.cn/info/1141/1710.htm" target="_blank" rel="noopener">公众号绑定、充值与联网官方说明 →</a><a href="https://netservice.nankai.edu.cn/" target="_blank" rel="noopener">校园网自助服务 →</a></div></div>
        </div>
      </article>

      <article id="step-college" class="timeline-step" :class="{ open: isOpen('college') }">
        <div class="timeline-node"><span>05</span><small>学院</small></div>
        <div class="timeline-card">
          <button class="timeline-trigger" :aria-expanded="isOpen('college')" aria-controls="detail-college" @click="toggle('college')"><span><small>学院活动</small><strong>确认班级、辅导员与第一场活动</strong><em>只从学院官网、认证公众号和南开飞书进入通知群</em></span><b>{{ isOpen('college') ? '收起' : '展开' }}</b></button>
          <div v-show="isOpen('college')" id="detail-college" class="timeline-detail"><div class="detail-grid"><div><h4>报到当天要问清</h4><ul><li>班级与辅导员姓名、官方通知群、第一次班会/年级会时间地点。</li><li>入学教育、专业介绍、安全教育和学院迎新活动是否需要签到。</li><li>陌生人以“学长学姐”名义收费、卖卡、代购或索要账号时，先向辅导员核实。</li></ul></div><div><h4>官方入口</h4><ul class="official-entry-list"><li><a href="https://zsb.nankai.edu.cn/xueyuan/index.html" target="_blank" rel="noopener">南开本科招生网·院系纵览</a><span>从这里进入各学院官方页面</span></li><li><a href="https://finance.nankai.edu.cn/jcqc_34626/list16.htm" target="_blank" rel="noopener">金融学院官网·南开金融青年</a><span>官网展示的官方微信入口</span></li><li><a href="https://xgb.nankai.edu.cn/news/content/id/874.html" target="_blank" rel="noopener">南开微学工 / 南开大学生</a><span>学校 2026 新生通知渠道</span></li></ul></div></div></div>
        </div>
      </article>

      <article id="step-dorm" class="timeline-step" :class="{ open: isOpen('dorm') }">
        <div class="timeline-node"><span>06</span><small>入住</small></div>
        <div class="timeline-card">
          <button class="timeline-trigger" :aria-expanded="isOpen('dorm')" aria-controls="detail-dorm" @click="toggle('dorm')"><span><small>搬入宿舍</small><strong>核对床位，检查水电与门锁</strong><em>购电、空调遥控器、饮用水一次理顺</em></span><b>{{ isOpen('dorm') ? '收起' : '展开' }}</b></button>
          <div v-show="isOpen('dorm')" id="detail-dorm" class="timeline-detail"><div class="detail-grid dorm-basics"><div><h4>进门先做</h4><ul><li>按分配信息入住，不私自换床；拍照记录门锁、家具、插座和空调的原始状态。</li><li>故障向楼宇值班室或飞书“南开校园微应用 → 后勤报修”反馈。</li><li>贵重物品随身保管；任何上门推销、收费安装先问楼管。</li></ul></div><div><h4>电费与饮水</h4><ul><li>飞书“南开校园微应用 → 电表充值”，用校园卡付款。八里台要区分“照明/插座”和“空调”两块表；津南按房间独立电表充值。</li><li>饮用水按楼内设备提示下载“胖乖生活”并绑定设备；楼宇设备可能不同，先核对机器上的运营方与编号，不扫来历不明的付款码。</li></ul></div></div><div class="air-guide"><a href="/images/air-conditioner-remote-guide.jpg" target="_blank" rel="noopener" aria-label="查看空调遥控器租用指南原图"><img src="/images/air-conditioner-remote-guide.jpg" alt="尼好校园空调遥控器租用指南现场照片" /></a><div><span class="local-source">津南理科宿舍区现场指南</span><h4>空调遥控器租用</h4><ol><li>微信进入“尼好校园”小程序，点“空调服务”。</li><li>点“开启服务”，选择收费模板并签署空调服务合同。</li><li>完成支付，在“订单中心”查看审核状态。</li><li>审核后凭服务订单前往服务网点领取遥控器。</li></ol><p><strong>办理点：</strong>理科宿舍学 5B—学 5C 中间过道二楼<br><strong>时间：</strong>24 小时全天候办理<br><strong>电话：</strong>400-000-7723；现场 15022052213</p></div></div><p class="evidence-note">这张照片记录的是现场张贴信息，可能随运营安排变更；办理前请再次核对宿舍楼最新告示。八里台及津南其他组团以本楼值班室说明为准。</p></div>
        </div>
      </article>

      <article id="step-dining" class="timeline-step" :class="{ open: isOpen('dining') }">
        <div class="timeline-node"><span>07</span><small>用餐</small></div>
        <div class="timeline-card">
          <button class="timeline-trigger" :aria-expanded="isOpen('dining')" aria-controls="detail-dining" @click="toggle('dining')"><span><small>食堂用餐</small><strong>第一次刷卡与供餐时段</strong><em>先用实体卡完成过渡余额写卡，再尝试付款码</em></span><b>{{ isOpen('dining') ? '收起' : '展开' }}</b></button>
          <div v-show="isOpen('dining')" id="detail-dining" class="timeline-detail"><div class="meal-times"><div><small>早餐</small><strong>06:30—09:00</strong></div><div><small>午餐</small><strong>10:30—13:30</strong></div><div><small>晚餐</small><strong>16:30—19:00</strong></div></div><div class="detail-grid"><div><h4>津南校区</h4><p>第一食堂、第二食堂、清真食堂；不同楼层开放餐次不同，一楼通常覆盖三餐，部分二、三楼以午晚餐为主。</p></div><div><h4>八里台校区</h4><p>第一食堂、第二食堂、第三食堂、清真食堂；部分二、三楼仅午晚餐或含夜餐。</p></div></div><p class="evidence-note">以上为学校最新公开服务指南中的统一供餐窗口；2026 开学日各楼层实际开放情况可能临时调整，请以食堂门口公告为准。校园卡单餐累计消费超过 50 元时需输密码，初始密码为身份证数字部分后 6 位。</p></div>
        </div>
      </article>

      <article id="step-recruit" class="timeline-step" :class="{ open: isOpen('recruit') }">
        <div class="timeline-node"><span>08</span><small>招新</small></div>
        <div class="timeline-card">
          <button class="timeline-trigger" :aria-expanded="isOpen('recruit')" aria-controls="detail-recruit" @click="toggle('recruit')"><span><small>团委学生组织</small><strong>报到安顿后了解招新活动</strong><em>阅读招新通知 → 了解部门 → 按要求报名</em></span><b>{{ isOpen('recruit') ? '收起' : '展开' }}</b></button>
          <div v-show="isOpen('recruit')" id="detail-recruit" class="timeline-detail">
            <div class="recruit-entry"><div><small>官方招新入口</small><h4>团委学生组织招新活动</h4><p>报到流程和宿舍安顿完成后，再根据兴趣、时间投入和个人发展方向了解各学生组织。具体组织介绍、报名方式及时间以通知原文为准。</p></div><a href="https://mp.weixin.qq.com/s/3pv87wtcj73WsgJbkh-ojg" target="_blank" rel="noopener">查看招新通知 →</a></div>
            <div class="detail-grid"><div><h4>打开通知后重点确认</h4><ul><li>招新对象、组织与部门职责。</li><li>宣讲或咨询时间、报名方式和截止时间。</li><li>是否需要填写报名表、参加面试或加入官方咨询群。</li></ul></div><div><h4>新生选择建议</h4><ul><li>先保证班会、入学教育和课程安排，再决定能够承担的工作量。</li><li>不要同时加入过多组织；选择真正感兴趣且能持续投入的方向。</li><li>报名入口只认通知原文和校团委官方渠道，正常招新不会索要账号密码或无说明收费。</li></ul></div></div>
          </div>
        </div>
      </article>
    </section>

    <section class="guide-next" aria-labelledby="guide-next-title"><div><span class="section-kicker"><i></i> 跟着地图走</span><h2 id="guide-next-title">关键地点已经标在校园地图</h2><p>可切换八里台与津南校区，查看校门、学院迎新区域、宿舍、食堂、校园卡服务点与校医院。</p></div><RouterLink class="button primary" to="/campus-map">查看关键地点 <span>→</span></RouterLink></section>

    <section class="guide-sources" aria-labelledby="source-title"><div class="section-heading compact"><span class="section-kicker"><i></i> 官方依据</span><h2 id="source-title">信息来源与更新时间</h2></div><p>页面核验于 2026 年 8 月 28 日。动态安排必须以个人录取材料、南开飞书和学院当日通知为准。</p><ul><li><a href="https://yx.nankai.edu.cn/onlineReg/undergraduate/index.html" target="_blank" rel="noopener">南开大学新生服务网：2026 本科网上报到</a></li><li><a href="https://mp.weixin.qq.com/s/3pv87wtcj73WsgJbkh-ojg" target="_blank" rel="noopener">团委学生组织招新活动通知</a></li><li><a href="https://wxb.nankai.edu.cn/info/1141/1710.htm" target="_blank" rel="noopener">南开大学信息化服务 Q&amp;A：校园网、统一身份、一卡通与购电</a></li><li><a href="https://zsb.nankai.edu.cn/2026-05-27/1813.html" target="_blank" rel="noopener">南开大学 2026 年本科招生章程：入学资格核验</a></li><li><a href="https://xgb.nankai.edu.cn/shenghuo/news/info/id/351.html" target="_blank" rel="noopener">南开大学学生生活指导中心：宿舍水电与生活设施</a></li><li><a href="https://hq.nankai.edu.cn/2025/0712/c23997a575228/pagem.htm" target="_blank" rel="noopener">南开大学后勤服务指南：供餐窗口与后勤服务</a></li><li><a href="https://www.nankai.edu.cn/212/list.htm" target="_blank" rel="noopener">南开大学专业学院目录与两校区地址</a></li></ul></section>
  </div>
</template>

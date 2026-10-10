# 南开校园生活指北 · NK 智行

面向南开大学新生与在校生的校园信息与导航网站，集中提供报到、办事、紧急联络、周边服务、常用链接和公众号入口。校园地图提供双校区地点检索、实景照片、主题游览路线，以及 NK 智行自然语言问答和导航。

> 电话、开放时间与应急安排以学校官方通知和现场情况为准。本项目不替代专业救援渠道。

## 当前功能与运行边界

- **校园信息**：八里台、津南的报到指南、办事指南、紧急联络、周边信息、常用链接、公众号与参与贡献入口。
- **校园地图**：校园导览图 / 在线底图、地点搜索、分类筛选、地点实景照片、候选地点确认、八里台主题游览路线。
- **NK 智行**：首页问题传递、校园问答、地标校史讲解；确认起终点后支持步行、骑行、驾车路线，高德检索用于未收录地点的坐标兜底。
- **实时导航**：主动授权定位后展示位置、精度范围、当前会话轨迹与偏航重规划；页面进入后台暂停定位，返回时恢复尚未结束的导航，结束或离开地图时清理。
- **独立保留部分**：`wws/` 三维校园原型、Django 信息管理脚手架和 Vercel Agent 代理均保留，部署边界见下表。

| 部分 | 技术与职责 | 发布方式 |
| --- | --- | --- |
| 主站 | Vue 3、Vue Router、Leaflet；页面与地图交互 | `frontend/` 构建为静态资源 |
| 主站 API | Cloudflare Worker；访问计数、问答转发、高德路线与地点代理 | 与主站一起发布；访问计数使用 Durable Object |
| 校园 Agent 代理 | `api/nk-zhixing.js`；创建 NK-GeniOS 会话并提问 | 独立服务；当前 Worker 调用 `nk-api.fallaxaura.com` |
| Django | `information/`、`student_emergency/`；管理脚手架 | 单独 Python 环境；不承载当前主站 API |
| 三维校园原型 | `wws/`；Three.js WebGL 漫游 | 独立静态页面；不随 `frontend/` 自动发布 |

## 本地运行

使用 Node.js 24（见 `frontend/.node-version`）和项目固定的 pnpm 11.19.0。已有 nvm / Corepack 时可以执行：

```bash
cd frontend
nvm use 24
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

没有 nvm / Corepack 时可使用已安装的 Node.js 24 和 pnpm 11.19.0；不要为安装依赖而重写锁文件。

Vite 地址默认为 `http://127.0.0.1:5173`。仅启动 Vite 即可查看页面，但需要 API 的功能还需启动本地 Worker。在另一个终端执行：

```bash
cd frontend
pnpm dev:worker
```

此命令先构建页面，再在 `http://127.0.0.1:8787` 启动本地 Worker。Vite 的 `/api` 默认转发到该地址；直接打开 8787 可检查生产构建、静态资源响应头和本地访问计数。Worker 代码修改由 Wrangler 重载，直接查看 8787 上的页面时需要重新构建前端。

如需指定其他 API 环境：

```bash
API_PROXY_TARGET=http://127.0.0.1:8787 pnpm dev
```

本地高德接口需要 `frontend/.dev.vars` 中的 `AMAP_WEB_SERVICE_KEY`，该文件不得提交。未配置时接口返回明确错误，静态页面仍可用。NK 智行会调用外置校园代理，需该服务正常响应；本地启动不会自动部署或替换它。

## 配置与数据流

```text
浏览器
  ├─ /api/visits            → Worker → Durable Object
  ├─ /api/nk-zhixing        → Worker → 校园代理 → NK-GeniOS
  ├─ /api/nk-zhixing/route  → Worker → 高德路线 API
  └─ /api/nk-zhixing/place  → Worker → 高德地点 API
```

- `AMAP_WEB_SERVICE_KEY` 配在 **Cloudflare Worker**，用于步行、骑行、驾车路线及地点查询；生产环境通过 `pnpm wrangler secret put AMAP_WEB_SERVICE_KEY` 设置。
- `NK_GENIOS_AGENT_API_URL`、`NK_GENIOS_AGENT_TOKEN` 配在 **独立校园代理**，不是主站 Worker。真实鉴权与接入步骤见 [连接配置](agent/NK_GENIOS_CONNECTION.md)。
- 页面输入最多 500 字；两层代理允许最多 8000 字的“用户输入＋校区 / 导航 / 校史上下文”。修改该边界时必须同步两个代理。**只发布主站，不能修复仍使用旧 500 字限制的外置代理。**
- 浏览器定位为 WGS-84；高德路线请求前转换为 GCJ-02。导览图点位、在线地图坐标与导航坐标用途不同，不应互换。
- 会话轨迹只保存在页面内存。用户发起路线规划或偏航重规划时，起终点坐标会发送至 Worker / 高德；以当前位置提问时，坐标也会随上下文转发给校园 Agent。结束导航不代表已发送给服务端的请求可以撤回。

## 代码结构与维护

```text
frontend/src/
├── App.vue                 # 应用外壳与导航渲染
├── composables/            # 移动菜单、访问计数的生命周期
├── components/             # 地图、地图控制、智行问答面板
├── views/                  # 页面组合与页面状态
├── data/                   # 校区地点、校史、导航目录、公众号资料
├── services/               # API 契约、地点解析与导航上下文
├── utils/                  # 请求、复制、定位会话、滚动锁、坐标工具
├── styles/                 # 基础、地图、页面、浏览器适配样式
└── style.css               # 样式加载顺序入口
frontend/worker/
├── index.js                # 路由、同源校验与访问计数
├── services.js             # 问答、路线、地点代理
└── requestUtils.js         # 响应、超时与坐标校验
```

维护时遵守以下边界：

1. 地点 / 公众号资料放 `data/`，不在组件中维护第二份；地点坐标需注明坐标系、来源和核验状态。
2. API 访问集中在 `services/`；请求必须有期限。切换校区、修改需求或离开页面后，不让旧响应覆盖新状态。
3. 地图实例、定位监听、定时器和弹窗必须在所属生命周期内释放。进入地图可请求一次定位以识别校区，实时导航由用户点击开启；两者都遵守浏览器权限。
4. 样式入口的导入顺序保留原有覆盖关系；页面规则写到对应样式文件，跨浏览器适配集中在 `styles/browser.css`。避免继续在单个文件末尾叠加互相覆盖的补丁。
5. 不删除看似未使用的旧模块、样式或原型来缩短文件；调整功能范围需先确认。项目工作流程以 [AGENTS.md](AGENTS.md) 为准。

## 检查与回归

在 `frontend/` 执行：

```bash
pnpm test          # 地图、定位、请求、导航解析、Worker 与 Vercel 代理回归
pnpm build        # Vue 生产构建
pnpm exec wrangler deploy --dry-run  # 只检查打包，不发布
# 或一次执行上述三项
pnpm check
```

保留 `pnpm test:map` 供单独检查地图工具。GitHub 部署流程会先运行完整 `pnpm test`，通过后才构建和发布。单元测试使用替代的定位与网络响应，不证明高德或 NK-GeniOS 线上可用。

浏览器回归至少覆盖：

| 场景 | 核验点 |
| --- | --- |
| 桌面 Chrome / Edge、Firefox、Safari | 九个页面、导航、刷新深链接、前进后退恢复滚动、键盘 Tab / Escape |
| iOS Safari、Android Chrome、常见系统浏览器 | 320px 起的窄屏、横竖屏、输入焦点、触控按钮、菜单滚动与关闭后恢复 |
| iOS / Android 微信内置浏览器 | 搜索、复制成功与拒绝后的手动复制、存储不可用时首页跳转、照片弹窗回退 |
| 地图 | 两校区与两种底图切换、搜索 / 筛选 / 地点选择、照片开关、主题游览路线 |
| 定位 | 同意 / 拒绝 / 超时，切后台返回，结束导航及离开页后停止监听 |
| 智行与路线 | 三种出行方式、候选确认、改问题 / 改校区后丢弃旧结果、校史讲解、接口超时 |

构建语法目标设为 Chrome 87、Edge 88、Firefox 78、Safari 14；这是语法转换目标，不是这些历史版本或所有微信内核的通过证明。使用能力检测处理剪贴板、弹窗与地图尺寸监听；动态视口高度有 `vh` 回退，保留用户缩放。定位依赖 HTTPS 或 localhost 以及系统 / 浏览器权限。微信真机仍需在 HTTPS 预览地址验收。

相关行为依据：[Vite 构建目标](https://vite.dev/config/build-options.html#build-target)、[Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)、[dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)。

## Django 与三维原型

Django 为独立脚手架。Python 3.12+ 可在仓库根目录创建独立环境：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python manage.py check
python manage.py runserver
```

`requirements-dev.txt` 固定本次已检查的依赖。需要使用管理后台时再按 Django 流程准备数据库和账号；主站不需要启动它，也不需要迁移数据库。

三维原型可以在仓库根目录执行 `python3 -m http.server 8000` 后打开 `http://localhost:8000/wws/`。它通过 CDN 加载 Three.js，首次运行需要网络；素材授权、实景全景和主站联动仍需独立推进。本轮主站浏览器回归不代表三维原型经过相同验收。

## 提交与发布

开发使用持久 `codex` 分支；提交并推送后创建至 `main` 的 PR。合并后 `main` 的 `frontend/**` 或部署工作流变更触发 GitHub Actions 发布。`api/` 的改动必须在校园代理对应环境另行发布；Django 和 `wws/` 也有独立部署边界。

完整发布说明见 [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md)。本地测试、生产构建和打包检查均不等于线上发布成功。

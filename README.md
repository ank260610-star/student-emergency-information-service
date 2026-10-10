# 南开校园生活指北 · NK 智行

面向南开大学新生与在校生的校园信息与导航网站。项目将报到、办事、紧急联络、周边出行等常用信息集中到一个移动端友好的站点，并在“校园地图”页面提供 **NK 智行**：自然语言地点识别、步行/骑行/驾车路线、浏览器实时定位与路线轨迹展示。

> 重要信息、开放时间和应急处置均应以学校官方通知及现场情况为准；本项目不替代 110、119、120 或校内专业救援渠道。

## 当前能力

- 双校区信息入口：八里台与津南的报到、办事、紧急联络、周边服务、常用链接及公众号。
- 校园地图：地点搜索、分类筛选、校园导览图与在线地图切换、地点卡片和参观路线。
- NK 智行导航：识别自然语言中的起点、终点与歧义地点；支持步行、骑行、驾车三种方式。
- 实时导航：在用户主动授权定位后显示当前位置、精度范围和本次浏览轨迹；偏离路线时尝试重新规划。位置与轨迹只保存在当前浏览器内存，结束导航即清除。
- 路线与地点兜底：优先使用项目地点数据；未收录地点可通过高德 Web 服务接口查找并绘制路线。
- Agent 安全边界：包含天气开场、安全提醒、无法定位时追问和紧急情形优先提示。详细规则与测试语料见 [`agent/`](agent/README.md)。
- 三维校园原型：[`wws/`](wws/) 中提供基于 Three.js 的津南校园 WebGL 漫游原型，后续可接入实景全景素材。

## 目录说明

```text
.
├── frontend/                 # 当前线上主站：Vue 3 + Vite + Leaflet + Cloudflare Worker
│   ├── src/                  # 页面、组件、地图数据、导航服务和测试
│   ├── worker/index.js       # 访问计数、NK 智行、路线与地点代理接口
│   └── wrangler.jsonc        # Worker、静态资源和 Durable Object 配置
├── agent/                    # NK 智行 Agent 的提示词、接入说明、POI 与评测语料
├── wws/                      # 独立运行的三维校园原型
├── api/                      # 兼容 Vercel 的 NK 智行代理实现
├── information/              # Django 信息管理脚手架
├── student_emergency/        # Django 配置（不参与当前 Worker 部署）
├── CLOUDFLARE_DEPLOYMENT.md  # Cloudflare 一次性配置与发布流程
└── *.md / output/            # 项目方案、汇报素材和已生成的交付材料
```

## 架构与数据流

```text
浏览器（Vue + Leaflet）
  ├─ /api/visits                 → Cloudflare Durable Object 访问计数
  ├─ /api/nk-zhixing             → 校园 NK 智行代理 → NK-GeniOS Agent
  ├─ /api/nk-zhixing/route       → Worker → 高德路线服务
  └─ /api/nk-zhixing/place       → Worker → 高德地点检索服务
```

浏览器不会持有高德 Web 服务密钥或 Agent 平台凭据。地图坐标按用途处理：浏览器定位的 WGS-84 坐标会在请求路线前转换为 GCJ-02；高德返回的路线折线按 GCJ-02 绘制。

## 本地启动主站

### 前置条件

- Node.js 24（版本以 [`frontend/.node-version`](frontend/.node-version) 为准）
- pnpm 11

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

随后打开终端给出的本地地址。生产构建和预览：

```bash
cd frontend
pnpm build
pnpm preview
```

说明：本地 Vite 开发服务器不会自动提供 Cloudflare Worker 接口；访问计数、Agent、在线地点检索和路线服务需要在 Worker 环境中配置后才可完整使用。

## 配置 NK 智行与地图服务

Cloudflare Worker 需要设置以下密钥，均不得写入前端代码、`wrangler.jsonc` 或 Git：

```bash
cd frontend
pnpm wrangler secret put AMAP_WEB_SERVICE_KEY
```

`AMAP_WEB_SERVICE_KEY` 用于服务器侧路线规划与地点检索。NK 智行的对话请求会转发到已部署的校园代理；若需调整 Agent API、令牌、工作流或 POI，请遵循 [`agent/NK_GENIOS_CONNECTION.md`](agent/NK_GENIOS_CONNECTION.md)。

开发或验收时，建议依次确认：

1. 在“校园地图”输入已收录地点，确认地点识别和候选地点选择正常。
2. 分别选择步行、骑行、驾车，确认在线地图能绘制路线。
3. 在 HTTPS 或 `localhost` 环境点击“使用当前位置”，授予定位权限后检查当前位置、轨迹和“结束实时导航”的清除行为。
4. 用 [`agent/Agent演示能力清单与测试语料.md`](agent/Agent演示能力清单与测试语料.md) 的 20 条语料回归测试 Agent。

## 常用检查

```bash
# 前端地图工具与导航服务的单元测试
cd frontend
pnpm test:map

# Vue 生产构建
pnpm build

# 仅检查 Cloudflare 打包，不发布
pnpm exec wrangler deploy --dry-run
```

仓库根目录还保留 Django 管理脚手架。它当前不承载线上业务，也不随 Cloudflare Worker 发布；如本机已准备 Django 环境，可执行：

```bash
python manage.py check
```

## 三维校园原型

`wws/` 为单独的静态 WebGL 原型，不会随 `frontend/` 的 Cloudflare 发布流程自动构建。可在仓库根目录启动任意静态文件服务器后访问：

```bash
python3 -m http.server 8000
```

然后打开 `http://localhost:8000/wws/`。原型通过 CDN 加载 Three.js，因此首次打开需要网络。实景全景图、建筑采景和主站地图的深度联动仍是后续工作，应先完成素材授权、压缩和热点坐标校验。

## 发布流程

线上发布由 GitHub Actions 在 `main` 分支的 `frontend/**` 变更后自动执行。首次部署的 Cloudflare 配置、权限和自定义域名说明见 [`CLOUDFLARE_DEPLOYMENT.md`](CLOUDFLARE_DEPLOYMENT.md)。

日常协作使用持久的 `codex` 分支：

1. 从 `main` 同步 `codex`。
2. 在 `codex` 完成修改和检查。
3. 提交并推送 `codex`，创建或更新至 `main` 的 Pull Request。
4. 在预览环境核验后合并；合并后再次将 `codex` 同步到 `main`。

具体约束与合并前检查清单见 [`AGENTS.md`](AGENTS.md)。

## 信息维护原则

- 联系电话、窗口地点、校车与迎新时间会变动；发布前必须用官方来源或现场信息复核。
- 个人定位信息不应上传、持久化或用于画像；本项目仅在用户主动开启实时导航时临时使用。
- 遇到医疗急症、火灾、违法犯罪或人身危险时，页面与 Agent 都应优先引导用户联系专业救援，不承诺响应时长。
- 新增 POI 时需注明校区、数据来源、坐标系、核验状态与更新时间；津南自建 MVP 与高德兜底数据必须明确区分。

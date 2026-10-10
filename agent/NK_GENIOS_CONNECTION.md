# NK-GeniOS 连接配置

## 实际调用链路

```text
Vue → Cloudflare Worker /api/nk-zhixing
    → https://nk-api.fallaxaura.com/api/nk-zhixing
    → NK-GeniOS create_conversation / chat_query_v2
```

主站 Worker 在 `frontend/worker/services.js` 转发问答；`api/nk-zhixing.js` 提供兼容 Vercel 的校园代理实现。外置代理的实际部署需由维护者核对，修改本仓库文件不会自动更新已运行的外部服务。

## 配置归属

| 配置 | 所属环境 | 作用 |
| --- | --- | --- |
| `AMAP_WEB_SERVICE_KEY` | 主站 Cloudflare Worker | 高德地点检索及步行 / 骑行 / 驾车路线 |
| `NK_GENIOS_AGENT_API_URL` | 校园 Agent 代理 | NK-GeniOS API 基础地址 |
| `NK_GENIOS_AGENT_TOKEN` | 校园 Agent 代理 | API 凭据；当前适配器必填 |
| `NK_ZHIXING_ALLOWED_ORIGINS` | 校园 Agent 代理，可选 | 逗号分隔的浏览器跨域来源；Worker 服务端调用不依赖此项 |

主站生产环境设置高德密钥：

```bash
cd frontend
pnpm wrangler secret put AMAP_WEB_SERVICE_KEY
```

本地可用未跟踪的 `frontend/.dev.vars` 设置同名值。Agent 凭据在独立代理的环境变量中配置，不能放进前端代码、已跟踪文件或日志。

当前适配器使用 `Apikey` 请求头以及请求体的 `AppKey`，并通过 `/create_conversation` 创建会话，再以 `/chat_query_v2` 的 `Query` 和 `ResponseMode: blocking` 提问。它不使用 Bearer 鉴权。平台契约若变化，应先取得实际 API 示例再修改适配器。

## 请求与响应

浏览器发送 `message`（用户问题及网页追加的校区、导航、校史上下文）和页面 `context` 元数据。Worker 当前只将完整的 `message` 转发给校园代理，不单独转发 `context`。

页面的用户输入上限为 500 字；两层代理的 `message` 总上限为 8000 字。更新限制时同时更新 Worker 和校园代理，避免校史资料等有效上下文被下游拒绝。

校园代理至少返回非空 `answer`。Worker 也兼容以下可选字段：

```json
{
  "answer": "建议先确认目的地。",
  "steps": [],
  "warning": "以现场情况为准。",
  "mapUrl": "https://example.com/map",
  "locationId": "项目地点 ID"
}
```

地图的实际路线由高德接口返回，Agent 不应自行编造距离或路线。前端检查结果类型、路线点以及地图链接协议；不完整的轨迹不会绘制为看似完整的直线。

## 超时与验收

- Vercel：创建会话 10 秒、回答 45 秒；部署函数预算为 60 秒。
- Worker：校园代理 60 秒，高德请求 12 秒；期限覆盖读取响应体。
- 浏览器：问答 65 秒、路线 20 秒、地点检索 15 秒；切校区、改问题或卸载取消旧请求。

本地单元测试只核验适配器契约与失败分支。发布后需分别检查代理环境凭据、长问题附加上下文、地标讲解、三种路线方式、上游拒绝与超时；再运行 `Agent演示能力清单与测试语料.md`。不要用本地替代响应的测试结果作为 NK-GeniOS 已上线的证据。

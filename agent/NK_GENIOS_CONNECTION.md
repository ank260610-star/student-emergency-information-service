# NK-GeniOS 连接配置

网站通过 Cloudflare Worker 的 `/api/nk-zhixing` 调用 NK‑GeniOS。浏览器不会直接接触平台令牌。

## 需要从 NK-GeniOS 获取的信息

在“NK 智行”的发布/API 接入页面确认：

1. Agent API 的完整 HTTPS 地址；
2. 鉴权方式和访问令牌；
3. 请求字段与响应字段示例；
4. 访问地址是否需要登录，以及评审账号如何体验。

## Cloudflare 配置

在 `frontend/` 目录执行以下两项配置：

```bash
pnpm wrangler secret put NK_GENIOS_AGENT_API_URL
pnpm wrangler secret put NK_GENIOS_AGENT_TOKEN
pnpm wrangler secret put AMAP_WEB_SERVICE_KEY
```

令牌为可选项；只有当 NK-GeniOS API 使用 Bearer Token 时才填写。不要把令牌写入 `.env`、`wrangler.jsonc`、前端代码或 Git 仓库。

`AMAP_WEB_SERVICE_KEY` 仅由 Worker 调用高德步行路线接口，获得可在网站在线地图上绘制的路线折线；不得暴露给浏览器。

## 当前代理契约

网站向 NK-GeniOS 发送：

```json
{
  "message": "我在津南西南门，想去中心图书馆。",
  "context": {
    "campus": "jinnan",
    "selectedLocation": { "id": "jinnan-southwest-gate", "name": "西南门" }
  }
}
```

网站期待 NK-GeniOS 返回以下结构：

```json
{
  "answer": "建议先……",
  "steps": ["第一步", "第二步"],
  "warning": "路线数据以现场为准。",
  "mapUrl": "https://…",
  "locationId": "jinnan-library"
}
```

如果平台实际字段不同，只需调整 `frontend/worker/index.js` 的 `proxyNkZhixingAgent` 中请求体与响应映射，页面和密钥边界不变。

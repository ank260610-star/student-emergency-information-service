# 学生骨干应急信息服务

这是一个面向学生骨干的应急信息查询网站。当前可部署版本位于 `frontend/`，使用 Vue、Vue Router 和 Vite 构建，并通过 Cloudflare Workers Static Assets 发布。

仓库根目录中的 Django 项目目前只是开发脚手架：没有业务模型、API 或完整依赖清单，也不参与 Cloudflare 部署。后续如果需要后台管理功能，应先确定数据模型和持久化方案，再选择 Cloudflare D1/Workers API 或独立的 Django 服务。

## 本地开发

请使用 Node.js 24 和 pnpm 11：

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

生产构建：

```bash
pnpm build
```

构建产物会生成在 `frontend/dist/`。

## Cloudflare Workers 部署

`frontend/wrangler.jsonc` 已将站点配置为单页应用，并绑定自定义域名 `azk.fallaxaura.dpdns.org`。首次部署前，请确认 Cloudflare DNS 中没有同名的冲突记录。

GitHub Actions 会在 `main` 分支有新提交时自动构建和部署。仓库所有者需要在 `Settings → Secrets and variables → Actions` 中添加：

- `CLOUDFLARE_API_TOKEN`：只授予目标账号的 Workers Scripts Edit，以及 `fallaxaura.dpdns.org` 区域的 Workers Routes Edit 权限。
- `CLOUDFLARE_ACCOUNT_ID`：目标 Cloudflare 账号 ID。

也可以在 `Actions → Deploy to Cloudflare Workers → Run workflow` 手动触发部署。

## 信息维护

紧急联系电话目前直接维护在 `frontend/src/views/ContactsView.vue`，校园地图位于 `frontend/public/images/`。公开部署前，请由学校或项目负责人再次核验联系电话、地图标注和公开授权；更新信息后提交到 `main` 即可触发重新部署。

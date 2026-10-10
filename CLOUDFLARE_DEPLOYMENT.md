# Cloudflare 主站发布

当前主站使用 `frontend/` 中的 Vue 静态资源、Cloudflare Worker 与 Durable Object。Django、`wws/` 和 `api/nk-zhixing.js` 不属于这一部署包。

## 现有 GitHub Actions 流程

`.github/workflows/deploy.yml` 在 `main` 分支的 `frontend/**` 或工作流文件变更时执行，也支持手动触发：安装锁定依赖 → 回归测试 → Vue 构建 → Wrangler 发布。

仓库需要以下 Actions secrets：

- `CLOUDFLARE_API_TOKEN`：用于 Worker 发布的令牌。
- `CLOUDFLARE_ACCOUNT_ID`：目标账户 ID。

在 Worker 环境配置 `AMAP_WEB_SERVICE_KEY`。NK-GeniOS 凭据属于独立校园代理，见 [连接配置](agent/NK_GENIOS_CONNECTION.md)。

`frontend/wrangler.jsonc` 定义 Worker 名称、资源绑定、访问计数绑定与静态页面回退；日常整理代码不需要重新创建服务、数据库或修改域名。

## 本地与发布前检查

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm check
```

另在已准备的 Python 环境执行 `python manage.py check`。有界面改动时，按 README 的浏览器表检查桌面与移动端交互，并核验手机 / 微信中的定位与复制权限。

`wrangler deploy --dry-run` 只检查本地包，不验证生产密钥、域名、外部代理或高德服务。

## 分支与预览

1. 使用持久 `codex` 分支，从 `main` 同步后开始修改。
2. 完成 `AGENTS.md` 的检查，再提交并推送 `codex`。
3. 创建或更新 `codex` → `main` 的 PR。
4. 如已配置 Cloudflare 分支预览，在其 HTTPS 地址核验；现有 GitHub Actions 文件本身没有创建 PR 预览的步骤。
5. 评审后合并；`main` 的匹配变更触发主站发布。保留 `codex` 供后续复用。

若使用 Cloudflare 控制台直接关联 Git 仓库，应选择实际维护的仓库，根目录为 `frontend`，构建命令 `pnpm build`，部署命令 `pnpm exec wrangler deploy`。分支预览需在该环境另行启用。选择一种生产发布入口，避免 GitHub Actions 与控制台构建重复发布同一分支。

## 独立代理

主站当前将问答转发到 `https://nk-api.fallaxaura.com/api/nk-zhixing`。`api/nk-zhixing.js` 与 `vercel.json` 是独立代理的适配器和函数配置；是否由哪个仓库、平台自动发布，必须核对实际环境。仅推送主站或只修改 `api/` 不会通过上述主站工作流更新外置代理。

问答请求的上下文上限需要两层代理一致。发布主站之后仍需更新旧代理并验证实际响应；不要把“构建成功”记录为“线上完整链路正常”。

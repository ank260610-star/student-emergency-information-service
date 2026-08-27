# Cloudflare Workers deployment

Cloudflare Workers deploys the Vue front end in `frontend/`. The Django admin site is not part of this static Worker deployment and requires separate server hosting if it is needed online.

## One-time Cloudflare setup

Complete this setup in the Cloudflare account that manages `fallaxaura.dpdns.org`.

1. Open **Workers & Pages** and choose **Create application**.
2. Import `ank260610-star/student-emergency-information-service` from GitHub.
3. Configure the build:

   - Worker name: `student-emergency-information-service`
   - Root directory: `frontend`
   - Production branch: `main`
   - Build command: `pnpm build`
   - Deploy command: `pnpm exec wrangler deploy`
   - Preview deploy command: `pnpm exec wrangler versions upload`

4. Enable builds for non-production branches so pushes to `codex` receive a preview URL and pull request status.
5. After the first successful production deployment, add `azk.fallaxaura.dpdns.org` as the Worker's custom domain.

For a private repository, the Cloudflare account performing the import must be authorized to read it. Grant only the permissions needed for this project; do not share account passwords or broad API tokens.

## Update workflow

1. Update local `codex` from `main`.
2. Make the requested change on `codex`.
3. Complete the review checklist in `AGENTS.md`.
4. Commit and push `codex`.
5. Open or update the single pull request from `codex` to `main`.
6. Check the Cloudflare preview attached to the pull request.
7. Merge after review; the push to `main` triggers production deployment.

Keep the `codex` branch after merging so the same branch can be reused for the next update.

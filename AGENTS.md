# Project workflow

## Branch policy

- Codex development uses the persistent `codex` branch.
- Open pull requests from `codex` into `main`.
- Do not create another working branch unless the user explicitly requests it.
- After a pull request is merged, update `codex` from `main` before starting the next change.

## Scope discipline

- Implement only the requested change and its necessary supporting work.
- Do not add unrelated features, dependencies, refactors, or documentation.
- Keep commit messages and pull request descriptions factual and concise.
- Describe what changed; do not document rejected, removed, or unrequested ideas.

## Required review before a pull request

1. Review the complete diff for scope, logic, structure, secrets, debug code, and generated files.
2. Run Django system checks.
3. Build the Vue application.
4. Run a Wrangler dry-run for Cloudflare packaging.
5. Test every changed interaction at desktop and mobile widths when UI code changes.
6. Do not open the pull request while any relevant check is failing.

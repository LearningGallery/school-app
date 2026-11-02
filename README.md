# school-app

Repo 1 of 3: the School Management System (React SPA, Express API, PostgreSQL). Layout and teaching context: [docs/00-overview](../docs/00-overview/README.md).

```bash
cp .env.example .env     # synthetic local values only
make up                  # docker compose up --build
make smoke               # key endpoints respond
make e2e                 # Playwright (needs: npx playwright install chromium)
make lint test           # lint, typecheck, unit tests
make test-integration    # real Postgres in docker
make down
```

| Path | What |
|---|---|
| `backend/` | Express + TypeScript API, `/healthz` `/readyz` `/startupz` `/metrics`, feature flags |
| `frontend/` | React + Vite SPA, served by non-root Nginx |
| `database/migrations/` | node-pg-migrate SQL migrations (v1 schema; expand/contract in module 19) |
| `tests/` | `unit/`, `integration/`, `smoke/`, `e2e/` |
| `Dockerfile.backend`, `Dockerfile.frontend` | multi-stage, non-root, base images pinned by digest |

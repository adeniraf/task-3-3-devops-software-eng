# DevOps in Action — Task API

A small TypeScript/Express REST API for a postgraduate CI/CD pipeline assignment. It stores tasks in memory and exposes health and readiness endpoints.

## Requirements
- Node.js 22.13+, 24, or 26+
- npm

## Run locally
```bash
npm ci
npm run dev
```
The API starts on port 3000 by default. Visit `http://localhost:3000/health` to confirm it is running.

## Verify
Use `npm ci` to install the versions in `package-lock.json`.

Keep direct dependencies pinned to exact versions. When updating a dependency, commit both `package.json` and `package-lock.json` in the same PR. The Dependency versions workflow checks the pins and runs a clean install.

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
npm start
```

## API
| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness probe |
| GET | `/ready` | Readiness probe |
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create a task with a title and default status `todo` |
| GET | `/api/tasks/:id` | Fetch task |
| PATCH | `/api/tasks/:id` | Update title and/or status |
| DELETE | `/api/tasks/:id` | Delete task |

Send JSON for POST and PATCH requests. Titles are trimmed and must contain a non-whitespace character. PATCH accepts a title, a status, or both. Valid statuses are `todo`, `in_progress`, and `done`.

Creation returns `201` with the task and a `Location` header. Deletion returns `204`. Invalid payloads return `400` and requests for missing tasks return `404`.

Example:
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Complete CI pipeline"}'
```

## Repository strategy
1. Keep `main` as the stable branch.
2. Create small branches, e.g. `feat/task-api`, `ci/github-actions`, `feat/observability`.
3. Open pull requests; record meaningful descriptions and test evidence. Enable required status checks when CI is introduced.
4. Merge only after tests pass; tag completed milestones, e.g. `v0.1.0`.

## Tests
- `tests/unit`: in-memory store behaviour and Express configuration.
- `tests/integration`: HTTP probes, task lifecycle, validation, and missing-task responses using Supertest.

## Important limitations
- In-memory store is **not persistent** and would not be suitable for multiple replicas. This keeps the assignment focused on delivery automation. We may add persistence only if it materially helps the deployment demonstration.
- `/ready` checks process responsiveness, not external dependencies (there are none yet).
- No authentication: this is a locally deployed educational demonstration, not a public service.

## Assignment deliverables roadmap
- Milestone 1: Application + tests + Git workflow.
- Milestone 2: GitHub Actions CI, quality gates.
- Milestone 3: Dependency scanning, multi-stage Docker and container scanning.
- Milestone 4: kind + Terraform-managed Kubernetes deployment, automated using a self-hosted runner.
- Milestone 5: Metrics, logs, Prometheus/Grafana and alerts.
- Milestone 6: Reproducibility checks, failure experiments, demo and Task 4 reflective analysis.

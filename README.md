# DevOps in Action — Task API

A small TypeScript/Express REST API for a postgraduate CI/CD pipeline assignment. It stores tasks in memory and exposes health and readiness endpoints.

- [Run and verify the API locally](#run-locally)
- [Build the Docker image and review the CI gates](#run-with-docker)
- [Deploy to Kubernetes](#deploy-locally-to-kubernetes)
- [View monitoring and run an alert demo](#monitor-the-local-deployment)
- [Find Task 3 demo evidence](#task-3-demo-evidence)

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

## Run with Docker

The multi-stage build uses the same Node.js major version as CI. The Alpine
runtime runs as UID 1000 and contains the compiled API and production
dependencies. The final stage removes npm and Yarn from the runtime filesystem.

```bash
docker build -t devops-task-api:local .
docker run --rm -d --name devops-task-api -p 127.0.0.1:3000:3000 devops-task-api:local
docker exec devops-task-api id
curl --fail --silent --show-error --retry 5 --retry-connrefused http://127.0.0.1:3000/health
curl --fail --silent --show-error http://127.0.0.1:3000/ready
curl --fail --silent --show-error -H 'Content-Type: application/json' \
  -d '{"title":"Verify container"}' http://127.0.0.1:3000/api/tasks
docker stop devops-task-api
```

Use a free host port if the local development server is already running.

## CI security scans

On pull requests and pushes to `main`, GitHub Actions runs two security checks.

- **Dependency Scan** audits the npm lockfile, including development dependencies.
- **Image Scan** builds the runtime image and uses Trivy to scan its OS and application packages.

Both checks fail on High or Critical vulnerabilities. Review the job logs or
download the scan reports from the GitHub Actions run artifacts.

On pushes to `main`, CI publishes to GitHub Container Registry after the
build, tests, code-quality checks, and both scans pass. The publishing job
loads the same image archive that Trivy scanned and CI smoke-tested.
Use the immutable `ghcr.io/...@sha256:...` reference in the publishing job
summary for deployment. Deployment access to a private package requires
registry authentication.

## Deploy locally to Kubernetes

Install Docker, kind, kubectl, Terraform and jq. CI currently publishes a
Linux AMD64 image. On ARM64, use a native kind node and a Docker engine that
can emulate AMD64 workloads. This was verified with Colima on Apple Silicon.

Use the image reference from a successful publishing job on `main`.
This example uses the verified image with request metrics from
[CI run 45070292212](https://github.com/adeniraf/task-3-3-devops-software-eng/actions/runs/45070292212).

```bash
kind create cluster --name task-api --kubeconfig "$HOME/.kube/task-api-config" --wait 120s
kubectl --kubeconfig "$HOME/.kube/task-api-config" get nodes -L kubernetes.io/arch

export TF_VAR_image='ghcr.io/adeniraf/task-3-3-devops-software-eng@sha256:4d7726e455ed5deb87c92784c329ac8e65f86ccb26e764b1835b4731968ae4c2'
terraform -chdir=deploy init
terraform -chdir=deploy apply
bash scripts/smoke-kubernetes.sh
```

Terraform creates a single replica and a ClusterIP Service. The deployment
uses `/health` for liveness and `/ready` for readiness. The smoke test waits
for rollout, forwards a loopback port, checks both probes, and creates a task.
Terraform state and the cluster credentials stay local.

To clean up, run `terraform -chdir=deploy destroy` with the same
`TF_VAR_image`, then delete the dedicated cluster with
`kind delete cluster --name task-api --kubeconfig "$HOME/.kube/task-api-config"`.

### Automated deployment verification

On a push to `main`, the deployment job waits for the scanned image to
publish successfully. It creates a fresh kind cluster on a GitHub-hosted
runner, applies Terraform with the published digest, and checks the rollout,
the API, and the running image digest. Download the `kind-deployment`
artifact from the workflow run to see the results.

The cluster and its kubeconfig exist for the lifetime of the job. This
exercises a clean deployment on every run. Use the local setup above for
a cluster that stays running for a demo.

## Monitor the local deployment

After deploying the image above, add Prometheus and Grafana to the local
kind cluster.

```bash
export KUBECONFIG="$HOME/.kube/task-api-config"
kubectl apply -k monitoring
kubectl rollout status deploy/task-api-prometheus
kubectl rollout status deploy/task-api-grafana
```

Run the following port-forwards in separate terminals with the same
`KUBECONFIG`. They bind to loopback for the local demo.

```bash
kubectl port-forward svc/task-api 3000:3000
kubectl port-forward svc/task-api-grafana 3001:3000
kubectl port-forward svc/task-api-prometheus 9090:9090
```

Generate traffic and open the [Task API dashboard](http://127.0.0.1:3001/d/task-api/task-api).
It shows request rate, HTTP errors, p95 latency, and scrape availability.

```bash
for i in {1..20}; do
  curl -fsS http://127.0.0.1:3000/api/tasks >/dev/null
  curl -sS http://127.0.0.1:3000/api/tasks/missing >/dev/null
  sleep 1
done
kubectl logs deploy/task-api --tail=10
```

To demonstrate alerting, scale the API to zero in the demo cluster. Open
[Prometheus Alerts](http://127.0.0.1:9090/alerts) and wait for
`TaskApiUnavailable` to become firing. Check the Deployment and Service
endpoints during the outage. Restore one replica and wait for the rule
to return to inactive.

```bash
kubectl scale deploy/task-api --replicas=0
kubectl get deployment task-api
kubectl get endpointslices -l kubernetes.io/service-name=task-api
# After the alert fires:
kubectl scale deploy/task-api --replicas=1
bash scripts/smoke-kubernetes.sh
```

For a CI failure, inspect the failed PR check. For a rollout failure, inspect
the main run and its `kind-deployment` artifact. For an operational outage,
use the Prometheus alert alongside Kubernetes events and application logs.

## API

Each completed application request emits a JSON log with its HTTP method,
status, and duration in milliseconds. The Prometheus endpoint `/metrics`
exports the `task_api_http_request_duration_seconds` histogram with a
`status_class` label. Liveness, readiness, and metrics scrapes are excluded.
Generate traffic on the task routes, then inspect logs with
`kubectl --kubeconfig "$HOME/.kube/task-api-config" logs deploy/task-api`
after deploying a build that includes instrumentation.

Use the histogram count for request rate and filter on `status_class="5xx"`
for server errors. Use its buckets for latency percentiles.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness probe |
| GET | `/ready` | Readiness probe |
| GET | `/metrics` | Prometheus request metrics |
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
- `tests/integration`: HTTP probes, task lifecycle, validation, missing-task responses, and Prometheus request metrics using Supertest.

## Important limitations
- In-memory store is **not persistent** and would not be suitable for multiple replicas. This keeps the assignment focused on delivery automation. We may add persistence only if it materially helps the deployment demonstration.
- `/ready` checks process responsiveness, not external dependencies (there are none yet).
- No authentication: this is a locally deployed educational demonstration, not a public service.

## Task 3 demo evidence

Use the [verification evidence index](docs/evidence/README.md) to find each part of the demo.

- **Git and CI** — the required check that blocked a merge and the passing rerun.
- **Container security** — the failed Trivy scan and the passing scan after remediation.
- **Deployment** — the automated kind rollout, matching image digest, and API smoke test.
- **Monitoring** — the Grafana dashboard, structured request logs, and the alert firing and clearing.

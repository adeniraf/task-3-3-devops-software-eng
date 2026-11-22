#!/usr/bin/env bash
set -euo pipefail

kubeconfig=${KUBE_CONFIG_PATH:-"$HOME/.kube/task-api-config"}
kubectl_args=(--kubeconfig "$kubeconfig" --context kind-task-api)

kubectl "${kubectl_args[@]}" rollout status deployment/task-api --timeout=120s
kubectl "${kubectl_args[@]}" get deployment,service,pod -l app.kubernetes.io/name=task-api

work_dir=$(mktemp -d)
: > "$work_dir/forward.log"
kubectl "${kubectl_args[@]}" port-forward --address 127.0.0.1 service/task-api :3000 > "$work_dir/forward.log" 2>&1 &
forward_pid=$!
trap 'kill "$forward_pid" 2>/dev/null || true; wait "$forward_pid" 2>/dev/null || true; rm -rf "$work_dir"' EXIT

address=
for attempt in {1..20}; do
  address=$(sed -nE 's/^Forwarding from (127\.0\.0\.1:[0-9]+) -> .*/\1/p' "$work_dir/forward.log")
  if [[ -n "$address" ]]; then
    break
  fi
  sleep 1
done
if [[ -z "$address" ]]; then
  cat "$work_dir/forward.log" >&2
  exit 1
fi

curl -fsS --max-time 5 "http://$address/health" | jq -e '.status == "ok"'
curl -fsS --max-time 5 "http://$address/ready" | jq -e '.status == "ready"'
status=$(curl -fsS --max-time 5 -o "$work_dir/task.json" -w '%{http_code}' \
  -H 'Content-Type: application/json' -d '{"title":"Kubernetes smoke test"}' "http://$address/api/tasks")
test "$status" = 201
jq -e '.title == "Kubernetes smoke test" and .status == "todo"' "$work_dir/task.json"
printf 'Passed /health, /ready, and POST /api/tasks (HTTP %s)\n' "$status"

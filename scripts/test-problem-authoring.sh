#!/usr/bin/env bash
# Disposable local PostgreSQL only. Never uses DATABASE_URL or a production credential.
set -euo pipefail
cd "$(dirname "$0")/.."
docker_local=(env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock)
container="physcratic-authoring-test-$$"
trap '"${docker_local[@]}" rm -f "$container" >/dev/null' EXIT
"${docker_local[@]}" run --rm -d --name "$container" -e POSTGRES_PASSWORD=local-test-only -e POSTGRES_DB=physcratic_authoring_test -p 127.0.0.1::5432 postgres:17-alpine >/dev/null
ready=false
for attempt in {1..30}; do
  if "${docker_local[@]}" exec "$container" pg_isready -U postgres >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
if [[ "$ready" != true ]]; then echo 'Disposable PostgreSQL did not become ready' >&2; exit 1; fi
port=$("${docker_local[@]}" inspect --format '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}' "$container")
export AUTHORING_TEST_DATABASE_URL="postgresql://postgres:local-test-only@127.0.0.1:${port}/physcratic_authoring_test"
if [[ $# -gt 0 ]]; then "$@"; else node_modules/.bin/tsx --test lib/problem-authoring-api.test.ts; fi

#!/usr/bin/env bash
# Disposable local PostgreSQL only. Never uses DATABASE_URL or a production credential.
set -euo pipefail
cd "$(dirname "$0")/.."
docker_local=(env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock)
container=""
cluster=""
cleanup() {
  if [[ -n "$container" ]]; then "${docker_local[@]}" rm -f "$container" >/dev/null; fi
  if [[ -n "$cluster" ]]; then
    "$pg_bin/pg_ctl" -D "$cluster/data" -m immediate -w stop >/dev/null 2>&1 || true
    rm -rf -- "$cluster"
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
if command -v docker >/dev/null && [[ -S /var/run/docker.sock ]]; then
  container="physcratic-authoring-test-$$"
  "${docker_local[@]}" run --rm -d --name "$container" -e POSTGRES_PASSWORD=local-test-only -e POSTGRES_DB=physcratic_authoring_test -p 127.0.0.1::5432 postgres:17-alpine >/dev/null
  ready=false
  for attempt in {1..30}; do
    if "${docker_local[@]}" exec "$container" pg_isready -U postgres >/dev/null 2>&1; then ready=true; break; fi
    sleep 1
  done
  if [[ "$ready" != true ]]; then echo 'Disposable PostgreSQL did not become ready' >&2; exit 1; fi
  port=$("${docker_local[@]}" inspect --format '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}' "$container")
else
  pg_bin="${PG_TEST_BINDIR:-$(pg_config --bindir 2>/dev/null || true)}"
  if [[ -z "$pg_bin" ]] && command -v initdb >/dev/null; then
    pg_bin=$(dirname "$(command -v initdb)")
  fi
  for tool in initdb pg_ctl createdb; do
    if [[ ! -x "$pg_bin/$tool" ]]; then
      echo 'Database tests require local Docker or PostgreSQL server tools (PG_TEST_BINDIR).' >&2
      exit 1
    fi
  done
  cluster=$(mktemp -d "${TMPDIR:-/tmp}/physcratic-postgres.XXXXXX")
  "$pg_bin/initdb" -D "$cluster/data" -U postgres -A trust --no-locale --encoding=UTF8 >/dev/null
  port=$(node -e 'const s=require("node:net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')
  "$pg_bin/pg_ctl" -D "$cluster/data" -l "$cluster/server.log" -o "-h 127.0.0.1 -p $port -k $cluster" -w -t 20 start >/dev/null
  "$pg_bin/createdb" -h 127.0.0.1 -p "$port" -U postgres physcratic_authoring_test
fi
export AUTHORING_TEST_DATABASE_URL="postgresql://postgres:local-test-only@127.0.0.1:${port}/physcratic_authoring_test"
# Even incidental imports of the application pool must stay on the disposable database.
export DATABASE_URL="$AUTHORING_TEST_DATABASE_URL"
if [[ $# -gt 0 ]]; then
  "$@"
else
  node --require ./tests/server-only-register.cjs --import tsx --test \
    lib/problem-authoring-api.test.ts lib/author-media-api.test.ts \
    lib/authored-grading-db.test.ts lib/authored-attempt-api.test.ts \
    lib/individual-rating.integration.test.ts
fi

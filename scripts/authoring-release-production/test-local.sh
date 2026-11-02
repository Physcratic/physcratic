#!/usr/bin/env bash
# Owned disposable localhost PostgreSQL only. Does not accept cloud connections.
set +x
set -euo pipefail
unset AUTHORING_PRODUCTION_DIRECT_URL AUTHORING_RELEASE_DIRECT_URL DATABASE_URL
cd "$(git rev-parse --show-toplevel)"
name="physcratic-production-runner-local-$$"
dock(){ env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock "$@"; }
cleanup(){ dock rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
dock run -d --name "$name" --label physcratic.task=production-runner-test --log-driver=none --tmpfs /var/lib/postgresql:rw,size=384m -e POSTGRES_PASSWORD=local-test-only -e POSTGRES_DB=physcratic_authoring_test -e 'POSTGRES_INITDB_ARGS=--locale-provider=builtin --builtin-locale=C.UTF-8' -p 127.0.0.1::5432 postgres:18.6-alpine >/dev/null
port=$(dock port "$name" 5432/tcp | cut -d: -f2)
for attempt in {1..40}; do
  if dock exec "$name" pg_isready -h 127.0.0.1 -U postgres -d physcratic_authoring_test >/dev/null 2>&1; then break; fi
  sleep 0.25
done
dock exec "$name" pg_isready -h 127.0.0.1 -U postgres -d physcratic_authoring_test >/dev/null
export AUTHORING_TEST_DATABASE_URL="postgresql://postgres:local-test-only@127.0.0.1:$port/physcratic_authoring_test"
mkdir -p work/final-alpha-execution
node scripts/authoring-release-production/rehearse-local.mjs

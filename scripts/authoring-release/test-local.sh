#!/usr/bin/env bash
# Disposable local resources only; never uses a remote URL or cloud API.
set -euo pipefail
cd "$(dirname "$0")/../.."
docker_local=(env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock)
container="physcratic-release-package-test-$$"
trap '"${docker_local[@]}" rm -f "$container" >/dev/null' EXIT
"${docker_local[@]}" run --rm -d --name "$container" -e POSTGRES_PASSWORD=local-test-only -e POSTGRES_DB=physcratic_authoring_test -p 127.0.0.1::5432 postgres:18.6-alpine >/dev/null
ready=false
for attempt in {1..60}; do
  # TCP readiness avoids observing the image's temporary Unix-only init server.
  if "${docker_local[@]}" exec "$container" pg_isready -h 127.0.0.1 -U postgres -d physcratic_authoring_test >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
[[ "$ready" == true ]] || { echo 'Disposable PG18.6 did not become ready' >&2; exit 1; }
port=$("${docker_local[@]}" inspect --format '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}' "$container")
export AUTHORING_TEST_DATABASE_URL="postgresql://postgres:local-test-only@127.0.0.1:${port}/physcratic_authoring_test"
umask 077
mkdir -p work/neon-release-audit work/staging-blocker-fixes
node --test scripts/authoring-release/release.test.mjs
node --input-type=module -e 'import {localClient,reset,applyFixture} from "./scripts/authoring-release/local-fixture.mjs"; const c=await localClient();try{await reset(c);await applyFixture(c,1,3);}finally{await c.end();}'
"${docker_local[@]}" cp scripts/authoring-release "$container:/audit"
umask 077
mkdir -p work/neon-release-audit work/staging-blocker-fixes
"${docker_local[@]}" exec "$container" psql -X -qAt -U postgres -d physcratic_authoring_test -v ON_ERROR_STOP=1 -f /audit/preflight-readonly.sql > work/neon-release-audit/psql-readonly-local.jsonl
node --input-type=module -e 'import assert from "node:assert/strict";import{readFile}from"node:fs/promises";const rows=(await readFile("work/neon-release-audit/psql-readonly-local.jsonl","utf8")).trim().split("\n").map(JSON.parse);assert.equal(rows[0].identity.read_only,"on");assert.equal(rows[0].identity.server_version_num,180006);assert.equal(rows.find(r=>r.kind==="ledger").rows.length,3);assert.ok(rows.some(r=>r.kind==="row_count"&&r.table==="user"));console.log("PASS standalone read-only psql artifact on PG18.6");'
"${docker_local[@]}" exec "$container" psql -X -qAt -U postgres -d physcratic_authoring_test -v ON_ERROR_STOP=1 -f /audit/baseline-supplement-readonly.sql > work/staging-blocker-fixes/baseline-supplement-local.txt
corepack pnpm exec tsx --conditions=react-server --test scripts/authoring-release/mail-audit.test.ts lib/author-media-storage.test.ts

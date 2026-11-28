#!/usr/bin/env bash
# Disposable loopback database only. Use the actual PowerShell and psql package.
set -euo pipefail
cd "$(dirname "$0")/../.."
command -v pwsh psql openssl node >/dev/null
docker_local=(env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock)
scratch=$(mktemp -d)
container="physcratic-0026-rehearsal-$$"
started=false
cleanup() {
  if [[ -n ${proxy_pid:-} ]]; then kill "$proxy_pid" 2>/dev/null || true; fi
  if [[ "$started" == true ]]; then "${docker_local[@]}" rm -f "$container" >/dev/null; fi
  rm -rf -- "$scratch"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
"${docker_local[@]}" run --rm -d --name "$container" -e POSTGRES_PASSWORD=synthetic-local-only -p 127.0.0.1::5432 postgres:18.7-alpine >/dev/null
started=true
db() { "${docker_local[@]}" exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres "$@"; }
for attempt in {1..25}; do
  if "${docker_local[@]}" exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj '/CN=127.0.0.1' -addext 'subjectAltName=IP:127.0.0.1' \
  -keyout "$scratch/server.key" -out "$scratch/server.crt" >/dev/null 2>&1
for path in server.key server.crt; do "${docker_local[@]}" cp "$scratch/$path" "$container:/var/lib/postgresql/$path"; done
"${docker_local[@]}" exec -u root "$container" sh -c 'chown postgres:postgres /var/lib/postgresql/server.* && chmod 600 /var/lib/postgresql/server.key'
db -c "ALTER SYSTEM SET ssl_cert_file='/var/lib/postgresql/server.crt'" -c "ALTER SYSTEM SET ssl_key_file='/var/lib/postgresql/server.key'" \
  -c "ALTER SYSTEM SET ssl='on'" -c 'SELECT pg_reload_conf()' >/dev/null
db <<'SQL' >/dev/null
CREATE ROLE synthetic_0026_owner NOLOGIN;
CREATE ROLE synthetic_0026_operator LOGIN NOINHERIT PASSWORD 'operator-local-only';
CREATE ROLE synthetic_0026_runtime LOGIN NOINHERIT PASSWORD 'runtime-local-only';
GRANT synthetic_0026_owner TO synthetic_0026_operator;
CREATE DATABASE physcratic_0026_test OWNER synthetic_0026_owner;
SQL
{
  cat <<'SQL'
SET ROLE synthetic_0026_owner;
SET search_path=public,pg_catalog;
CREATE TABLE "user"(id text PRIMARY KEY,name text,email text,"emailVerified" boolean,"createdAt" timestamptz,"updatedAt" timestamptz);
CREATE TABLE account(id text PRIMARY KEY,"userId" text,"providerId" text,password text);
CREATE TABLE session(id text PRIMARY KEY,"userId" text,token text,"createdAt" timestamptz,"expiresAt" timestamptz);
CREATE TABLE solution_evidence(id uuid PRIMARY KEY,"userId" text,pathname text NOT NULL,filename text);
SQL
  for migration in migrations/00{01,02,03,04,05,06,07,08,09,10,11,12,13,14,15,17,18}*.up.sql; do cat "$migration"; done
  cat <<'SQL'
CREATE TABLE physcratic_production_migrations(id text PRIMARY KEY,sha256 text NOT NULL,source_commit text NOT NULL,
 applied_at timestamptz NOT NULL DEFAULT clock_timestamp(),applied_by text NOT NULL DEFAULT current_user,result text NOT NULL CHECK(result='verified'));
INSERT INTO physcratic_production_migrations(id,sha256,source_commit,result)
 VALUES('0018_account_deletion','378ff9140a5eab9d62c70505eb764ad1f621ebe26f6d840c62826aee00d61cda',repeat('1',40),'verified');
INSERT INTO "user"(id) VALUES('synthetic-blob-owner');
INSERT INTO authored_problem(id,slug,owner_id) VALUES('00000000-0000-4000-8000-000000000001','synthetic','synthetic-blob-owner');
INSERT INTO author_media(id,problem_id,purpose,pathname,filename,media_type,bytes,sha256,state)
 SELECT gen_random_uuid(),'00000000-0000-4000-8000-000000000001','statement-image','author-media/synthetic/'||n,
  'test.png','image/png',4,repeat('a',64),'ready' FROM generate_series(1,6) n;
INSERT INTO solution_evidence(id,"userId",pathname,filename)
 SELECT gen_random_uuid(),'synthetic-blob-owner','solution-evidence/synthetic/'||n,'test.png' FROM generate_series(1,3) n;
CREATE FUNCTION synthetic_refuse_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Synthetic late ledger failure'; END $$;
CREATE TRIGGER synthetic_refuse_ledger BEFORE INSERT ON physcratic_production_migrations
 FOR EACH ROW EXECUTE FUNCTION synthetic_refuse_ledger();
SQL
} | db -d physcratic_0026_test >/dev/null

port=$("${docker_local[@]}" inspect --format '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}' "$container")
unset PGSERVICE PGSERVICEFILE PGHOSTADDR PGOPTIONS PGPASSWORD PGSSLNEGOTIATION
export PGSSLMODE=verify-full PGSSLROOTCERT="$scratch/server.crt" PGPASSFILE="$scratch/pass file"
printf '127.0.0.1:%s:physcratic_0026_test:synthetic_0026_operator:operator-local-only\n' "$port" > "$PGPASSFILE"
printf '127.0.0.1:%s:physcratic_0026_test:synthetic_0026_runtime:runtime-local-only\n' "$port" >> "$PGPASSFILE"
chmod 600 "$PGPASSFILE"
plan="$scratch/approved plan.json"
package=scripts/account-deletion-0026
manifest=$(sha256sum "$package/PACKAGE_SHA256SUMS" | cut -d ' ' -f1)
commit=$(git rev-parse HEAD)
export REHEARSAL_PG_PORT="$port"
python3 - "$plan" <<'PY'
import datetime,json,os,sys
plan = dict(providerProject="synthetic",providerBranch="synthetic",endpointEvidence="loopback test",endpoint="127.0.0.1",
            port=int(os.environ["REHEARSAL_PG_PORT"]),database="physcratic_0026_test",loginRole="synthetic_0026_operator",
            migrationOwner="synthetic_0026_owner",runtimeRole="synthetic_0026_runtime",serverVersion=180007,
            ownerApproval="synthetic only",recoveryEvidence="synthetic only",writerFenceEvidence="only local fixture",
            servingConfigEvidence="synthetic only",deletionOff=True,singleAttemptServing=True,
            windowEndsUtc=(datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%SZ"))
with open(sys.argv[1],"w") as file:
    json.dump(plan,file)
PY
operate() {
  local action=$1 digest
  digest=$(sha256sum "$plan" | cut -d ' ' -f1)
  pwsh -NoProfile -File "$package/install.ps1" -Action "$action" -PackageCommit "$commit" -ManifestSha256 "$manifest" -Plan "$plan" -PlanSha256 "$digest"
}
operate Inspect > "$scratch/inspect.log"
grep -Eq 'SSL [Cc]onnection.*(true|protocol: TLSv1\.[23])' "$scratch/inspect.log"
grep -Eq '^ +t +\| +TLSv1\.[23]' "$scratch/inspect.log"
# A separate plaintext compute verifies that the installer relies on
# client certificate and hostname verification on a TLS-terminating endpoint.
db -c "ALTER SYSTEM SET ssl='off'" -c 'SELECT pg_reload_conf()' >/dev/null
for attempt in {1..20}; do
  if [[ $(db -Atc 'SHOW ssl') == off ]]; then break; fi
  sleep 0.1
done
[[ $(db -Atc 'SHOW ssl') == off ]]
node --input-type=module - "$port" "$scratch" <<'JS' > "$scratch/tls-proxy.port" &
import { readFileSync } from 'node:fs';
import { createConnection, createServer } from 'node:net';
import { createSecureContext, TLSSocket } from 'node:tls';
const [port, dir] = process.argv.slice(2);
const secureContext = createSecureContext({ cert:readFileSync(dir+'/server.crt'), key:readFileSync(dir+'/server.key') });
const server = createServer(raw => {
  raw.once('data', request => {
    if (request.length !== 8 || request.readInt32BE(0) !== 8 || request.readInt32BE(4) !== 80877103) return raw.destroy();
    raw.write('S');
    const client = new TLSSocket(raw, { isServer:true, secureContext });
    const backend = createConnection({ host:'127.0.0.1', port:Number(port) });
    client.on('error', () => backend.destroy());
    backend.on('error', () => client.destroy());
    client.on('close', () => backend.destroy());
    backend.on('close', () => client.destroy());
    client.pipe(backend).pipe(client);
  });
});
server.listen(0,'127.0.0.1',()=>console.log(server.address().port));
JS
proxy_pid=$!
for attempt in {1..20}; do
  [[ ! -s "$scratch/tls-proxy.port" ]] || break
  sleep 0.1
done
proxy_port=$(cat "$scratch/tls-proxy.port")
[[ "$proxy_port" =~ ^[0-9]+$ ]]
printf '127.0.0.1:%s:physcratic_0026_test:synthetic_0026_operator:operator-local-only
' "$proxy_port" >> "$PGPASSFILE"
direct_plan=$plan
proxy_plan="$scratch/proxy plan.json"
hostname_plan="$scratch/hostname mismatch plan.json"
python3 - "$direct_plan" "$proxy_plan" "$proxy_port" "$hostname_plan" <<'PYTHON'
import json, sys
with open(sys.argv[1]) as f:
    target = json.load(f)
target["port"] = int(sys.argv[3])
with open(sys.argv[2], "w") as f:
    json.dump(target, f)
target["endpoint"] = "localhost"
with open(sys.argv[4], "w") as f:
    json.dump(target, f)
PYTHON
plan=$proxy_plan
operate Inspect > "$scratch/proxy.log"
grep -Eq 'SSL [Cc]onnection.*(true|protocol: TLSv1\.[23])' "$scratch/proxy.log"
grep -Eq '^ +f +\|[[:space:]]*$' "$scratch/proxy.log"
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj '/CN=untrusted-rehearsal-ca' \
  -keyout "$scratch/untrusted.key" -out "$scratch/untrusted.crt" >/dev/null 2>&1
if PGSSLROOTCERT="$scratch/untrusted.crt" operate Inspect > "$scratch/untrusted.log" 2>&1; then
  echo 'Expected untrusted CA refusal' >&2; exit 1
fi
grep -q 'certificate verify failed' "$scratch/untrusted.log"
plan=$hostname_plan
if operate Inspect > "$scratch/hostname.log" 2>&1; then echo 'Expected hostname refusal' >&2; exit 1; fi
grep -q 'does not match host name' "$scratch/hostname.log"
plan=$direct_plan
if operate Inspect > "$scratch/plaintext.log" 2>&1; then echo 'Expected plaintext refusal' >&2; exit 1; fi
grep -q 'server does not support SSL' "$scratch/plaintext.log"
db -c "ALTER SYSTEM SET ssl='on'" -c 'SELECT pg_reload_conf()' >/dev/null
for attempt in {1..20}; do
  if [[ $(db -Atc 'SHOW ssl') == on ]]; then break; fi
  sleep 0.1
done
[[ $(db -Atc 'SHOW ssl') == on ]]
echo 'PASS direct and proxy client TLS, backend observations, and plaintext, untrusted CA and hostname refusal'
# Exercise the existing Install and Verify checks through the authenticated proxy.
plan=$proxy_plan
python3 - "$plan" "$scratch/proxy.log" <<'PY'
import json,re,sys
with open(sys.argv[1]) as file:
    plan=json.load(file)
with open(sys.argv[2]) as file:
    match=re.search(r'([a-f0-9]{64}) \| ([a-f0-9]{64})\s+\|\s+6\s+\|\s+0\s+\|\s+3',file.read())
assert match,"Unexpected synthetic inventory"
plan["ledgerSha256"],plan["inventorySha256"]=match.groups()
with open(sys.argv[1],"w") as file:
    json.dump(plan,file)
PY
if pwsh -NoProfile -File "$package/install.ps1" -Action Install -PackageCommit "$commit" -ManifestSha256 "$manifest" \
    -Plan "$plan" -PlanSha256 "$(printf '%064d' 0)" > "$scratch/checksum.log" 2>&1; then
  echo 'Expected plan checksum refusal' >&2; exit 1
fi
grep -q 'Private plan checksum mismatch' "$scratch/checksum.log"
db -d physcratic_0026_test -c "UPDATE solution_evidence SET filename='changed.png' WHERE pathname='solution-evidence/synthetic/1'" >/dev/null
if operate Install > "$scratch/drift.log" 2>&1; then echo 'Expected inventory drift refusal' >&2; exit 1; fi
grep -q 'approved schema, ledger or held inventory changed' "$scratch/drift.log"
db -d physcratic_0026_test -c "UPDATE solution_evidence SET filename='test.png' WHERE pathname='solution-evidence/synthetic/1'" >/dev/null
db -d physcratic_0026_test -c 'ALTER DEFAULT PRIVILEGES FOR ROLE synthetic_0026_owner GRANT SELECT ON TABLES TO synthetic_0026_runtime' >/dev/null
if operate Install > "$scratch/acl.log" 2>&1; then echo 'Expected unsafe default ACL refusal' >&2; exit 1; fi
grep -q 'Unexpected effective acknowledgement or upload-state privilege' "$scratch/acl.log"
db -d physcratic_0026_test -c 'ALTER DEFAULT PRIVILEGES FOR ROLE synthetic_0026_owner REVOKE SELECT ON TABLES FROM synthetic_0026_runtime' >/dev/null
if operate Install > "$scratch/late.log" 2>&1; then echo 'Expected ledger failure' >&2; exit 1; fi
grep -q 'Synthetic late ledger failure' "$scratch/late.log" || { cat "$scratch/late.log"; exit 1; }
[[ $(db -At -d physcratic_0026_test -c "SELECT (to_regclass('account_deletion_pending_upload') IS NULL AND to_regprocedure('account_deletion_upload_finished(text,text,text)') IS NULL AND NOT EXISTS(SELECT 1 FROM physcratic_production_migrations WHERE id LIKE '0026%'))::text") == true ]]
db -d physcratic_0026_test -c 'DROP TRIGGER synthetic_refuse_ledger ON physcratic_production_migrations' >/dev/null
operate Install
operate Verify
[[ $(psql -X -w -h 127.0.0.1 -p "$port" -U synthetic_0026_runtime -d physcratic_0026_test -Atc "SELECT
 has_function_privilege(current_user,'public.account_deletion_upload_finished(text,text,text)','EXECUTE')
 AND NOT has_function_privilege(current_user,'public.account_deletion_execute(text,text,text,text)','EXECUTE')
 AND NOT has_table_privilege(current_user,'public.account_deletion_pending_upload','SELECT')") == t ]]
if operate Install > "$scratch/replay.log" 2>&1; then echo 'Expected replay refusal' >&2; exit 1; fi
grep -q '0026 exists or approved schema' "$scratch/replay.log"
echo 'PASS proxy Install and Verify, nine-path backfill, runtime LOGIN scope, atomic late failure, and checksum, drift, ACL and replay refusal'

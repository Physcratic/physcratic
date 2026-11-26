#!/usr/bin/env bash
# Creates and removes its own PostgreSQL container. No user connection is used.
set -euo pipefail
cd "$(dirname "$0")/../.."
package=scripts/retrospective-baseline
scratch=$(mktemp -d)
container="physcratic-retrospective-$$"
proxy_pid=""
docker_local() { env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock "$@"; }
cleanup() {
  if [[ -n "$proxy_pid" ]]; then kill "$proxy_pid" 2>/dev/null || true; fi
  docker_local rm -f "$container" >/dev/null 2>&1 || true
  rm -rf -- "$scratch"
}
trap cleanup EXIT
docker_local run -d --rm --name "$container" -e POSTGRES_PASSWORD=synthetic-only -p 127.0.0.1::5432 postgres:18.7-alpine >/dev/null
db() { docker_local exec -i "$container" psql -X -q -v ON_ERROR_STOP=1 -U postgres "$@"; }
for attempt in {1..25}; do
  if docker_local exec "$container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj '/CN=127.0.0.1' -addext 'subjectAltName=IP:127.0.0.1' \
  -keyout "$scratch/server.key" -out "$scratch/server.crt" >/dev/null 2>&1
for file in server.key server.crt; do docker_local cp "$scratch/$file" "$container:/var/lib/postgresql/$file"; done
docker_local exec -u root "$container" sh -c 'chown postgres:postgres /var/lib/postgresql/server.* && chmod 600 /var/lib/postgresql/server.key'
db -c "ALTER SYSTEM SET ssl_cert_file='/var/lib/postgresql/server.crt'" \
  -c "ALTER SYSTEM SET ssl_key_file='/var/lib/postgresql/server.key'" \
  -c "ALTER SYSTEM SET ssl='on'" -c 'SELECT pg_reload_conf()' >/dev/null

base_commit=9e0a3c94ab97da2b679d8e2faad9556d2b7f8f20
apply() {
  local file=$1 id digest source
  id=$(basename "$file" .up.sql)
  digest=$(sha256sum "$file" | cut -d ' ' -f1)
  source=$base_commit
  case "$id" in
    0020_*) source=bf82e81c46ec434cf6976e1b1f25dba6fe963266 ;;
    0026_*) source=ee236380364a0a0f96145ac1ac753cb5cca11c4f ;;
  esac
  {
    printf 'SET search_path=public,pg_catalog;\n'
    if ! rg -q '^BEGIN;' "$file"; then printf 'BEGIN;\n'; fi
    cat "$file"
    printf '\n'
    if ! rg -q '^BEGIN;' "$file"; then printf 'COMMIT;\n'; fi
    # Synthetic ledger only, to exercise the read-only verification path.
    printf "INSERT INTO physcratic_production_migrations(id,sha256,source_commit,result) VALUES('%s','%s','%s','verified');\n" "$id" "$digest" "$source"
  } | db -d retrospective_fixture
}

db -c 'CREATE ROLE synthetic_runtime LOGIN NOINHERIT' -c 'CREATE DATABASE retrospective_fixture'
db -d retrospective_fixture <<'SQL'
CREATE TABLE "user"(id text PRIMARY KEY,name text,email text,"emailVerified" boolean,"createdAt" timestamptz,"updatedAt" timestamptz);
CREATE TABLE account(id text PRIMARY KEY,"userId" text,"providerId" text,password text);
CREATE TABLE session(id text PRIMARY KEY,"userId" text,token text,"createdAt" timestamptz,"expiresAt" timestamptz);
CREATE TABLE contest(id uuid PRIMARY KEY);
CREATE TABLE solution_evidence(id uuid PRIMARY KEY,"userId" text,pathname text NOT NULL,filename text);
CREATE TABLE physcratic_production_migrations(
 id text PRIMARY KEY,sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 source_commit text NOT NULL,applied_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 applied_by text NOT NULL DEFAULT CURRENT_USER,result text NOT NULL CHECK(result='verified')
);
SQL
for file in migrations/00{01,02,03,04,05,06,07,08,09,10,11,12,13,14,15,16,17,18,20,21,22,24}*.up.sql; do apply "$file"; done

db -d retrospective_fixture <<'SQL'
GRANT SELECT,INSERT ON authored_revision,authored_attempt TO synthetic_runtime;
GRANT SELECT,INSERT,DELETE ON community_favourite TO synthetic_runtime;
GRANT SELECT,INSERT,UPDATE ON community_favourite_limit,community_profile,community_profile_write_limit,
 community_badge_selection,community_achievement_write_limit TO synthetic_runtime;
GRANT SELECT ON community_problem_total,community_external_approved_medal TO synthetic_runtime;
GRANT EXECUTE ON FUNCTION community_showcase_ids_valid(text[]) TO synthetic_runtime;
SQL

port=$(docker_local inspect --format '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}' "$container")
unset PGPASSWORD
export PGSSLROOTCERT="$scratch/server.crt" PGPASSFILE="$scratch/pgpass"
printf '127.0.0.1:*:retrospective_fixture:postgres:synthetic-only\nlocalhost:*:retrospective_fixture:postgres:synthetic-only\n' > "$PGPASSFILE"
chmod 600 "$PGPASSFILE"
capture() {
  node --input-type=module - "$1" "$port" <<'JS'
import { runPsqlCapture } from './scripts/retrospective-baseline/transport.mjs';
const [output, port] = process.argv.slice(2);
runPsqlCapture({
  target:{ endpoint:'127.0.0.1', port:Number(port), database:'retrospective_fixture', login:'postgres', version:180007 },
  runtimeRole:'synthetic_runtime',
}, output);
JS
}

capture "$scratch/core.json"
for file in migrations/00{19,23,25,26}*.up.sql; do
  apply "$file"
  if [[ "$file" == *0026* ]]; then
    db -d retrospective_fixture -c 'GRANT EXECUTE ON FUNCTION account_deletion_upload_finished(text,text,text) TO synthetic_runtime'
  fi
  capture "$scratch/$(basename "$file" .up.sql).json"
done

node --input-type=module - "$scratch" > "$scratch/reference.json" <<'JS'
import { createHash } from 'node:crypto';
import { readFileSync as read, readdirSync } from 'node:fs';
const dir = process.argv[2];
const sha = input => createHash('sha256').update(input).digest('hex');
const encode = JSON.stringify;
const sort = values => Object.fromEntries(Object.entries(values).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
const load = name => JSON.parse(read(dir + '/' + name + '.json'));
const catalogue = capture => sort(Object.fromEntries(Object.entries(capture.catalogue).map(([key,value]) => [key, sha(encode(value))])));
const publicGrants = capture => capture.acl.filter(row => row[2] === 'PUBLIC')
  .map(([key, column, , , privilege, grantable]) => {
    if (column || grantable) throw Error('Unexpected public grant shape');
    return [key,privilege];
  }).sort((a,b) => encode(a).localeCompare(encode(b),'en'));
const migrations = Object.fromEntries(readdirSync('migrations').filter(file => /^00\d\d_.+\.up\.sql$/.test(file) && Number(file.slice(0,4)) <= 26)
  .sort().map(file => [file.slice(0,-7),sha(read('migrations/'+file))]));
const core = load('core');
const overlays = {};
const changed = new Set();
let prior = core;
for (const id of Object.keys(migrations).filter(id => /^(0019|0023|0025|0026)_/.test(id))) {
  const next = load(id), before = catalogue(prior), after = catalogue(next);
  const delta = Object.fromEntries(Object.entries(after).filter(([key,digest]) => digest !== before[key]));
  for (const key of Object.keys(before)) if (!(key in after)) delta[key] = null;
  for (const key of Object.keys(delta)) {
    if (changed.has(key)) throw Error('Later migrations overlap on ' + key);
    changed.add(key);
  }
  const previousPublic = publicGrants(prior).map(encode), nextPublic = publicGrants(next);
  if (!previousPublic.every(grant => nextPublic.some(row => encode(row) === grant))) throw Error('Unmodelled optional PUBLIC revoke');
  overlays[id] = { catalogue: sort(delta), publicGrants: nextPublic.filter(row => !previousPublic.includes(encode(row))) };
  prior = next;
}
console.log(JSON.stringify({ postgresReference:180007, migrations, catalogue:catalogue(core), publicGrants:publicGrants(core), overlays },null,2));
JS

if [[ "$#" == 1 && "$1" == --reference ]]; then
  cat "$scratch/reference.json"
  exit 0
fi
if [[ "$#" != 0 ]]; then echo 'Usage: rehearse-local.sh [--reference]' >&2; exit 1; fi
cmp "$package/reference.json" "$scratch/reference.json"

node --input-type=module - "$scratch" "$port" <<'JS'
import { readFileSync as read, writeFileSync as write } from 'node:fs';
const [dir, port] = process.argv.slice(2);
const load = name => JSON.parse(read(dir + '/' + name + '.json'));
for (const variant of ['core','0026_account_deletion_blockers']) {
  const capture = load(variant);
  const plan = {
    version:1, approvalToInspect:'synthetic container only',
    target:{ ...capture.target, providerBindingRef:'disposable loopback', providerProject:'local',
      providerBranch:'fixture', endpoint:'127.0.0.1', port:Number(port) },
    objectOwner:'postgres', runtimeRole:'synthetic_runtime', ownershipAndAclEvidence:'fixture grants',
    ownerOverrides:{}, publicRevocations:[], defaultAcl:[], roleMemberships:[],
    additionalGrants:capture.acl.filter(row => row[2] !== 'PUBLIC'),
    expectedLaterMigrations:Object.fromEntries(capture.ledger.filter(row => /^(0019|0023|0025|0026)_/.test(row.id))
      .map(row => [row.id,{ sourceCommit:row.sourceCommit, authorizationRef:'synthetic optional migration' }])),
  };
  write(dir+'/'+variant+'.plan.json',JSON.stringify(plan));
}
JS

manifest=$(sha256sum "$package/PACKAGE_SHA256SUMS" | cut -d ' ' -f1)
verify() {
  local plan=$1 evidence=$2 digest
  digest=$(sha256sum "$scratch/$plan.plan.json" | cut -d ' ' -f1)
  node "$package/verify.mjs" "$scratch/$plan.plan.json" "$digest" "$manifest" "$scratch/$evidence.json"
}
later=0026_account_deletion_blockers
verify core core > "$scratch/core.result.json"
verify "$later" "$later" > "$scratch/full.result.json"
if node "$package/verify.mjs" "$scratch/core.plan.json" "$(printf '%064d' 0)" "$manifest" "$scratch/core.json" > "$scratch/checksum.log" 2>&1; then
  echo 'Expected checksum refusal' >&2; exit 1
fi
rg -q 'Inspection plan checksum mismatch' "$scratch/checksum.log"
if verify core "$later" > "$scratch/unapproved.result.json"; then echo 'Expected unapproved later migrations to fail' >&2; exit 1; fi
rg -q '"key": "0026_account_deletion_blockers"' "$scratch/unapproved.result.json"
if psql -X -qAt -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$port" -U postgres \
  -d 'dbname=retrospective_fixture sslmode=verify-full gssencmode=disable' \
  -v expected_database=wrong_database -v expected_login=postgres -v expected_version=180007 \
  -v runtime_role=synthetic_runtime -f "$package/capture.sql" > "$scratch/wrong-target.json" 2>"$scratch/wrong-target.log"; then
  echo 'Expected wrong target refusal' >&2; exit 1
fi
test ! -s "$scratch/wrong-target.json"

# Terminate the actual client TLS session and forward plain PostgreSQL traffic
# to the disposable compute. One psql process collects conninfo and the snapshot.
node --input-type=module - "$port" "$scratch" <<'JS' > "$scratch/proxy.port" &
import { readFileSync } from 'node:fs';
import { createConnection, createServer } from 'node:net';
import { createSecureContext, TLSSocket } from 'node:tls';
const [backendPort, dir] = process.argv.slice(2);
const secureContext = createSecureContext({ cert:readFileSync(dir+'/server.crt'), key:readFileSync(dir+'/server.key') });
const server = createServer(raw => {
  raw.once('data', request => {
    if (request.length !== 8 || request.readInt32BE(0) !== 8 || request.readInt32BE(4) !== 80877103) {
      return raw.destroy();
    }
    raw.write('S');
    const client = new TLSSocket(raw, { isServer:true, secureContext });
    const backend = createConnection({ host:'127.0.0.1', port:Number(backendPort) });
    client.on('error', () => backend.destroy());
    backend.on('error', () => client.destroy());
    client.on('close', () => backend.destroy());
    backend.on('close', () => client.destroy());
    client.pipe(backend).pipe(client);
  });
});
server.listen(0, '127.0.0.1', () => console.log(server.address().port));
JS
proxy_pid=$!
for attempt in {1..25}; do
  if [[ -s "$scratch/proxy.port" ]]; then break; fi
  sleep 0.2
done
proxy_port=$(cat "$scratch/proxy.port")
[[ "$proxy_port" =~ ^[0-9]+$ ]]

node --input-type=module - "$scratch" "$proxy_port" <<'JS'
import { readFileSync as read, writeFileSync as write } from 'node:fs';
const [dir, port] = process.argv.slice(2);
const plan = JSON.parse(read(dir+'/0026_account_deletion_blockers.plan.json'));
plan.target.port = Number(port);
write(dir+'/proxy.plan.json',JSON.stringify(plan));
plan.target.endpoint = 'localhost';
write(dir+'/hostname.plan.json',JSON.stringify(plan));
JS
proxy_digest=$(sha256sum "$scratch/proxy.plan.json" | cut -d ' ' -f1)
capture_via_proxy() {
  node "$package/verify.mjs" "$scratch/proxy.plan.json" "$proxy_digest" "$manifest" "$1" --capture
}
PGSSLMODE=disable capture_via_proxy "$scratch/proxy.json" > "$scratch/proxy.result.json"
if PGSSLROOTCERT="$scratch/missing.crt" capture_via_proxy "$scratch/untrusted.json" > "$scratch/untrusted.log" 2>&1; then
  echo 'Expected untrusted CA refusal' >&2; exit 1
fi
test ! -e "$scratch/untrusted.json"
rg -qi 'root certificate|certificate verify' "$scratch/untrusted.log"
hostname_digest=$(sha256sum "$scratch/hostname.plan.json" | cut -d ' ' -f1)
if node "$package/verify.mjs" "$scratch/hostname.plan.json" "$hostname_digest" "$manifest" "$scratch/hostname.json" --capture > "$scratch/hostname.log" 2>&1; then
  echo 'Expected verify-full hostname mismatch refusal' >&2; exit 1
fi
test ! -e "$scratch/hostname.json"
rg -qi 'certificate.*does not match host name' "$scratch/hostname.log"
psql_version=$(psql --version)
printf 'Transport client: %s\n' "$psql_version"
node --input-type=module - "$scratch" "$psql_version" <<'JS'
import assert from 'node:assert/strict';
import { readFileSync as read, writeFileSync as write } from 'node:fs';
import { attestPsqlOutput, captureTransport } from './scripts/retrospective-baseline/transport.mjs';
const [dir, psqlVersion] = process.argv.slice(2);
const proxy = JSON.parse(read(dir+'/proxy.json'));
const direct = JSON.parse(read(dir+'/core.json'));
assert.equal(direct.target.backendTls.ssl, true);
assert.deepEqual(proxy.target.backendTls, { ssl:false, protocol:null });
assert.equal(proxy.clientTls.sslMode,'verify-full');
assert.match(captureTransport(proxy).client.protocol, /^TLSv1\.[23]$/);
if (psqlVersion.startsWith('psql (PostgreSQL) 18.')) {
  assert.match(proxy.clientTls.conninfo, /^SSL Connection\|true\nSSL Protocol\|TLSv1\.[23]$/);
} else if (/^psql \(PostgreSQL\) 1[5-7]\./.test(psqlVersion)) {
  assert.match(proxy.clientTls.conninfo, /^SSL connection \(protocol: TLSv1\.[23],/);
}
assert.equal(JSON.parse(read(dir+'/proxy.result.json')).status,'CATALOGUE_MATCH_PENDING_REVIEW');
const actualConninfo = proxy.clientTls.conninfo;
delete proxy.clientTls;
const snapshot = JSON.stringify(proxy);
const aligned = ' SSL Connection       | true\n SSL Protocol         | TLSv1.3';
assert.equal(captureTransport(attestPsqlOutput('Connection Information\r\n'+aligned.replaceAll('\n','\r\n')+'\r\n'+snapshot)).client.protocol,'TLSv1.3');
for (const evidence of [
  'SSL Protocol|TLSv1.3',
  'SSL Connection|false\nSSL Protocol|TLSv1.3',
  'SSL Connection|true\nSSL Protocol|TLSv1.1',
  'SSL Connection|true\nSSL Connection|false\nSSL Protocol|TLSv1.3',
  'SSL Connection|true\nSSL Protocol|TLSv1.3\nSSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, compression: off)',
  actualConninfo+'\n'+actualConninfo,
]) assert.throws(() => attestPsqlOutput(evidence+'\n'+snapshot), /Missing or unsupported client TLS/);
assert.throws(() => attestPsqlOutput(snapshot), /Missing or unsupported client TLS/);
write(dir+'/missing-client-tls.json',snapshot);
JS
if verify proxy missing-client-tls > "$scratch/missing-client-tls.result.json"; then echo 'Expected missing client TLS evidence to fail' >&2; exit 1; fi
rg -q 'client or backend transport evidence' "$scratch/missing-client-tls.result.json"

db -d retrospective_fixture <<'SQL'
ALTER TABLE "user" DISABLE TRIGGER community_profile_claim_signup;
DROP INDEX community_external_medal_user_idx;
ALTER FUNCTION community_external_medal_award(text,text,text,integer,text,text,text) SECURITY DEFINER;
ALTER TABLE community_favourite DROP CONSTRAINT community_favourite_key_check;
ALTER TABLE community_favourite ADD CONSTRAINT community_favourite_key_check CHECK (true);
GRANT SELECT(tally_reference) ON community_external_medal TO synthetic_runtime;
ALTER TABLE community_external_medal_audit OWNER TO synthetic_runtime;
ALTER DEFAULT PRIVILEGES GRANT SELECT ON TABLES TO synthetic_runtime;
CREATE ROLE synthetic_unreviewed_role NOLOGIN;
GRANT synthetic_unreviewed_role TO synthetic_runtime;
CREATE ROLE synthetic_inbound LOGIN;
GRANT synthetic_runtime TO synthetic_inbound;
UPDATE physcratic_production_migrations SET sha256=repeat('0',64) WHERE id='0021_arena_favourite_key_pattern';
SQL
capture "$scratch/drift.json"
if verify "$later" drift > "$scratch/drift.result.json"; then echo 'Expected catalogue drift refusal' >&2; exit 1; fi
for finding in 'trigger:user.community_profile_claim_signup' 'index:community_external_medal.community_external_medal_user_idx' \
  'routine:public.community_external_medal_award(text,text,text,integer,text,text,text)' \
  'constraint:community_favourite.community_favourite_key_check' 'relation:community_external_medal.tally_reference' \
  'relation:community_external_medal_audit' '0021_arena_favourite_key_pattern'; do
  rg -Fq "\"key\": \"$finding\"" "$scratch/drift.result.json"
done
rg -Fq '"check": "unsafe creator default ACL"' "$scratch/drift.result.json"
rg -Fq '"check": "runtime LOGIN, memberships or database/schema privileges"' "$scratch/drift.result.json"
rg -Fq '"check": "memberships in scoped owner or grantee roles"' "$scratch/drift.result.json"
echo 'PASS direct and proxy TLS captures, untrusted CA and missing evidence refusals, checksum/target refusal, ledger and catalogue drift, ownership and effective ACLs'

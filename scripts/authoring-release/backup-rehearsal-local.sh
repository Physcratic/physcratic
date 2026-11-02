#!/usr/bin/env bash
# Synthetic data ONLY. No cloud connection/configuration, ports, mounts or tokens.
set -euo pipefail
cd "$(dirname "$0")/../.."
umask 077
scratch=$(mktemp -d /tmp/physcratic-backup-rehearsal.XXXXXXXX)
container="physcratic-backup-rehearsal-$$"
docker_local=(env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock)
cleanup() {
  "${docker_local[@]}" rm -f "$container" >/dev/null 2>&1 || true
  # Only this script's private, freshly created synthetic fixture/key/archive.
  rm -rf -- "$scratch"
}
trap cleanup EXIT
command -v gpg >/dev/null
"${docker_local[@]}" run --rm -d --network none --name "$container" -e POSTGRES_PASSWORD=synthetic-local-only -e POSTGRES_DB=neondb postgres:18.6-alpine >/dev/null
ready=false
for attempt in {1..60}; do
  if "${docker_local[@]}" exec "$container" pg_isready -h 127.0.0.1 -U postgres -d neondb >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
[[ "$ready" == true ]] || exit 1
"${docker_local[@]}" cp scripts/authoring-release "$container:/audit"
node --input-type=module > "$scratch/fixture.sql" <<'NODE'
import {migrations,historicalSource} from './scripts/authoring-release/core.mjs';
console.log(`CREATE TABLE public."user"(id text PRIMARY KEY,marker text NOT NULL);
CREATE TABLE public.physcratic_integration_migrations(id text PRIMARY KEY,sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),source_commit text NOT NULL,applied_at timestamptz NOT NULL DEFAULT clock_timestamp(),applied_by text NOT NULL DEFAULT CURRENT_USER,result text NOT NULL CHECK(result='verified'));`);
for (const m of (await migrations()).slice(0,3)) {
 console.log(m.sql);
 console.log(`INSERT INTO public.physcratic_integration_migrations(id,sha256,source_commit,result) VALUES('${m.id}','${m.sha256}','${historicalSource}','verified');`);
}
console.log(`INSERT INTO public."user" VALUES('synthetic-owner','preserve');
INSERT INTO public.authored_problem(id,slug,owner_id) VALUES('00000000-0000-4000-8000-000000000001','backup-fixture','synthetic-owner');
INSERT INTO public.authored_draft(problem_id,content) VALUES('00000000-0000-4000-8000-000000000001','{"private":"synthetic draft"}');
CREATE TABLE public.solution_attempt(id bigserial PRIMARY KEY,body text NOT NULL);
INSERT INTO public.solution_attempt(body) VALUES('legacy record'),('duplicate'),('duplicate');
CREATE SCHEMA extra; CREATE TABLE extra.retained(id integer PRIMARY KEY,body jsonb);
INSERT INTO extra.retained VALUES(1,'{"synthetic":"retain outside public"}');
SELECT lo_from_bytea(12345,decode('0001feff','hex'));`);
NODE
"${docker_local[@]}" exec -i "$container" psql -X -qAt -U postgres -d neondb -v ON_ERROR_STOP=1 < "$scratch/fixture.sql" >/dev/null
"${docker_local[@]}" exec "$container" psql -X -qAt -U postgres -d neondb -v ON_ERROR_STOP=1 -f /audit/backup-metadata-readonly.sql > "$scratch/metadata"
coproc SNAPSHOT { "${docker_local[@]}" exec -i "$container" psql -X -qAt -U postgres -d neondb -v ON_ERROR_STOP=1; }
holder_pid=$SNAPSHOT_PID
printf '%s\n' 'BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE;' 'SELECT pg_export_snapshot();' >&"${SNAPSHOT[1]}"
read -r snapshot <&"${SNAPSHOT[0]}"
[[ "$snapshot" =~ ^[0-9A-Fa-f]+-[0-9A-Fa-f]+-[0-9]+$ ]] || exit 1
manifest() {
  local database=$1
  local snapshot_sql=${2:-}
  printf '%s\n' 'BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY;' "$snapshot_sql" '\i /audit/backup-integrity-readonly.sql' 'ROLLBACK;' |
    "${docker_local[@]}" exec -i "$container" psql -X -qAt -U postgres -d "$database" -v ON_ERROR_STOP=1
}
manifest neondb "SET TRANSACTION SNAPSHOT '$snapshot';" > "$scratch/source.integrity"
# A throwaway test key, never a real backup recipient or staging credential.
mkdir "$scratch/keyring"
gpg --homedir "$scratch/keyring" --batch --pinentry-mode loopback --passphrase '' --quick-generate-key 'Synthetic local backup test <backup@example.invalid>' rsa2048 encr 1d 2> "$scratch/keygen.log"
recipient=$(gpg --homedir "$scratch/keyring" --batch --with-colons --list-keys 2>/dev/null | awk -F: '$1=="fpr" { print $10; exit }')
"${docker_local[@]}" exec "$container" pg_dump -U postgres -d neondb --format=custom --snapshot="$snapshot" |
  gpg --homedir "$scratch/keyring" --batch --trust-model always --recipient "$recipient" --encrypt --output "$scratch/db.dump.gpg"
manifest neondb "SET TRANSACTION SNAPSHOT '$snapshot';" > "$scratch/source-after.integrity"
cmp "$scratch/source.integrity" "$scratch/source-after.integrity"
printf '%s\n' 'ROLLBACK;' '\q' >&"${SNAPSHOT[1]}"
wait "$holder_pid"
"${docker_local[@]}" exec "$container" createdb -U postgres restored
gpg --homedir "$scratch/keyring" --batch --quiet --decrypt "$scratch/db.dump.gpg" |
  "${docker_local[@]}" exec -i "$container" pg_restore -U postgres -d restored --single-transaction --exit-on-error --no-owner --no-privileges
manifest restored > "$scratch/restored.integrity"
cmp "$scratch/source.integrity" "$scratch/restored.integrity"
# Rehearse a rename cutover without dropping the original database. This uses
# LOCAL postgres privileges; it does not prove Neon permissions or capacity.
"${docker_local[@]}" exec "$container" psql -X -qAt -U postgres -d postgres -v ON_ERROR_STOP=1 -c 'ALTER DATABASE neondb RENAME TO retained_before_cutover' >/dev/null
"${docker_local[@]}" exec "$container" psql -X -qAt -U postgres -d postgres -v ON_ERROR_STOP=1 -c 'ALTER DATABASE restored RENAME TO neondb' >/dev/null
manifest neondb > "$scratch/cutover.integrity"
cmp "$scratch/source.integrity" "$scratch/cutover.integrity"
manifest retained_before_cutover > "$scratch/retained.integrity"
cmp "$scratch/source.integrity" "$scratch/retained.integrity"
# A logical manifest must notice loss, and a corrupt archive must fail restore.
"${docker_local[@]}" exec "$container" psql -X -qAt -U postgres -d neondb -v ON_ERROR_STOP=1 -c "UPDATE extra.retained SET body='{}' WHERE id=1" >/dev/null
manifest neondb > "$scratch/changed.integrity"
if cmp -s "$scratch/source.integrity" "$scratch/changed.integrity"; then exit 1; fi
"${docker_local[@]}" exec "$container" createdb -U postgres corrupt_restore
if printf 'corrupt archive' | "${docker_local[@]}" exec -i "$container" pg_restore -U postgres -d corrupt_restore --single-transaction --exit-on-error --no-owner --no-privileges 2> "$scratch/expected-corrupt-error"; then exit 1; fi
verified=$("${docker_local[@]}" exec "$container" psql -X -qAt -U postgres -d neondb -v ON_ERROR_STOP=1 -c "SELECT to_regclass('public.authored_attempt') IS NULL AND to_regclass('public.solution_attempt') IS NOT NULL AND (SELECT count(*) FROM public.physcratic_integration_migrations)=3")
[[ "$verified" == t ]]
echo 'PASS PG18.6 encrypted full-database restore: historical ledger, legacy table, private draft, extra schema, sequence, large object, retained-original rename cutover; mutation and corrupt archive detected'

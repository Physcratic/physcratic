#!/usr/bin/env bash
# Run as a script in Windows Git Bash, never source or paste its body.
set +x
set -euo pipefail
umask 077
test "$#" = 3 || { echo 'Usage: bash WINDOWS_OPERATOR.sh --read-only|--execute CANDIDATE_SHA PACKAGE_SHA256'; exit 1; }
mode=$1
candidate=$2
package=$3
case "$mode" in --read-only|--execute) ;; *) echo 'STOP: explicit mode required'; exit 1;; esac
cd "$(git rev-parse --show-toplevel)"
test "$(git rev-parse HEAD)" = "$candidate"
test -z "$(git status --porcelain --untracked-files=no)"
test "$(sha256sum scripts/authoring-release-production/PACKAGE_SHA256SUMS | cut -d ' ' -f1)" = "$package"
(cd scripts/authoring-release-production && sha256sum -c PACKAGE_SHA256SUMS >/dev/null)
node -e 'if(Number(process.versions.node.split(".")[0])<22)process.exit(1)'
node --input-type=module -e "await import('pg')"
printf '%s\n' 'Target: Production br-quiet-dawn-b7m2zrt3 / ep-snowy-heart-b7c1220y / neondb / neondb_owner.'
printf '%s\n' 'Common lock: hashtextextended('\''physcratic:authoring:migrations:v1'\'',0).'
if [ "$mode" = --execute ]; then printf '%s\n' 'THIS MODE EXECUTES canonical 0001-0006 once under the existing conditional authorization.'; fi
printf '%s\n' 'Confirm all other sessions, developers, manual SQL, DDL, cleanup/external jobs and Production deployments remain held.'
IFS= read -r -p 'Type HOLD AND LOCK CONFIRMED: ' confirmation
test "$confirmation" = 'HOLD AND LOCK CONFIRMED' || { echo 'STOP: hold not confirmed'; exit 1; }
printf '%s\n' 'Use the same Windows host that passed direct TLS. Do not paste credentials in chat or commands.'
trap 'unset AUTHORING_PRODUCTION_DIRECT_URL' EXIT
IFS= read -rs -p 'Direct Production neondb_owner URL selected privately from Neon: ' AUTHORING_PRODUCTION_DIRECT_URL
printf '\n'
export AUTHORING_PRODUCTION_DIRECT_URL
evidence=$(mktemp -d "${TMPDIR:-/tmp}/physcratic-production.XXXXXXXX")
window_start=$(node -e 'console.log(new Date().toISOString())')
window_end=$(node -e 'console.log(new Date(Date.now()+30*60*1000).toISOString())')
printf 'Window UTC: %s to %s\n' "$window_start" "$window_end"
printf 'Private evidence directory: %s\n' "$evidence"
# Node expects native Windows paths, not Git Bash /tmp aliases.
native_evidence=$evidence
if command -v cygpath >/dev/null 2>&1; then native_evidence=$(cygpath -w "$evidence"); fi
node scripts/authoring-release-production/operator.mjs "$mode" "$candidate" "$package" "$native_evidence" "$window_start" "$window_end" HOLD_AND_COMMON_LOCK_CONFIRMED VERIFIED_WINDOWS_HOST
unset AUTHORING_PRODUCTION_DIRECT_URL
printf '%s\n' 'Finished. Retain the private evidence directory. Do not repeat execution.'

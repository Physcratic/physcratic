#!/usr/bin/env bash
# Closes the open "deploy-blocked" issues that a live deployment has made obsolete.
#
#   GH_TOKEN=... REPO=owner/name LIVE_SHA=<40 hex> bash scripts/close-deploy-blocked.sh
#
# LIVE_SHA is a commit whose "Vercel - financial-dashboard" status is success. Every open issue
# labelled deploy-blocked whose commit is that commit or one of its ancestors is closed with the
# comment "Live in <short sha>.", because its changes are in the live build. Issues for newer
# commits stay open. Used by .github/workflows/deploy-watch.yml, and tested in lib/deploy-watch.test.ts.
set -uo pipefail

: "${REPO:?REPO is required}"
: "${LIVE_SHA:?LIVE_SHA is required}"

if ! [[ "$LIVE_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "LIVE_SHA must be a full 40 character commit SHA, got: $LIVE_SHA" >&2
  exit 2
fi
short="${LIVE_SHA:0:7}"

# A commit that is not on main (a preview deployment) never closes anything.
on_main=$(gh api "repos/$REPO/compare/main...$LIVE_SHA" --jq .status 2>/dev/null || echo unknown)
if [[ "$on_main" != behind && "$on_main" != identical ]]; then
  echo "$short is not on main (compare says: $on_main), nothing to close."
  exit 0
fi

issues=$(gh issue list --repo "$REPO" --label deploy-blocked --state open --limit 200 --json number,title,body) || {
  echo "Could not list the deploy-blocked issues." >&2
  exit 1
}
count=$(jq 'length' <<<"$issues")
echo "$count open deploy-blocked issue(s), live commit $short."

closed=0
failed=0
for index in $(seq 0 $((count - 1))); do
  number=$(jq -r ".[$index].number" <<<"$issues")
  title=$(jq -r ".[$index].title" <<<"$issues")
  body=$(jq -r ".[$index].body // \"\"" <<<"$issues")

  # The blocked commit: the full SHA in the body, else the short SHA in the title.
  blocked=$(grep -oE '/commit/[0-9a-f]{40}' <<<"$body" | head -1 | cut -d/ -f3 || true)
  if [[ -z "$blocked" ]]; then
    title_short=$(grep -oE '[0-9a-f]{7,40}$' <<<"$title" | head -1 || true)
    if [[ -n "$title_short" ]]; then
      blocked=$(gh api "repos/$REPO/commits/$title_short" --jq .sha 2>/dev/null || true)
    fi
  fi
  if ! [[ "$blocked" =~ ^[0-9a-f]{40}$ ]]; then
    echo "#$number: no commit found in the body or title, leaving it open."
    continue
  fi

  # compare base...head: "ahead" or "identical" means the live commit contains the blocked one.
  relation=$(gh api "repos/$REPO/compare/$blocked...$LIVE_SHA" --jq .status 2>/dev/null || echo unknown)
  if [[ "$relation" == ahead || "$relation" == identical ]]; then
    if gh issue close "$number" --repo "$REPO" --reason completed --comment "Live in $short."; then
      echo "#$number: closed, ${blocked:0:7} is in $short."
      closed=$((closed + 1))
    else
      echo "#$number: could not close it." >&2
      failed=$((failed + 1))
    fi
  else
    echo "#$number: ${blocked:0:7} is not an ancestor of $short ($relation), leaving it open."
  fi
done

echo "Closed $closed issue(s), $failed failed."
[[ "$failed" -eq 0 ]]

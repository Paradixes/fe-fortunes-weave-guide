#!/usr/bin/env bash
# Deploy the committed HEAD to production from this machine.
# Validates like the old CI job, packages a clean `git archive` (no untracked or
# uncommitted files), sends it to the server receiver and confirms the live sha.
set -euo pipefail
cd "$(dirname "$0")/.."
HOST=${DEPLOY_HOST:-fe-guide}  # ssh alias for the production server
SITE=https://fe-fortunes-weave.intramode.site
SHA=$(git rev-parse HEAD)
git fetch -q origin
[ "$(git rev-parse origin/main)" = "$SHA" ] || { echo "HEAD $SHA is not origin/main; push first." >&2; exit 1; }

WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
git archive HEAD | tar -x -C "$WORK/"
(
  cd "$WORK"
  GEN="data/catalog.json dist/catalog.js dist/roster.json dist/learning.json dist/map.json"
  mkdir -p .gen && for f in $GEN; do cp "$f" ".gen/${f//\//_}"; done
  node scripts/build-catalog.cjs >/dev/null
  for f in $GEN; do cmp -s "$f" ".gen/${f//\//_}" || { echo "Committed $f is stale; rebuild the catalogue." >&2; exit 1; }; done
  rm -rf .gen
  for s in scripts/verify-*.cjs; do node "$s" >/dev/null; done
  python3 scripts/verify-sqlite.py >/dev/null
  python3 scripts/verify-deploy.py >/dev/null
)
python3 scripts/check-public-export.py >/dev/null
echo "Checks passed for ${SHA:0:7}."
[ -z "${DRY_RUN:-}" ] || exit 0

printf '{"sha": "%s", "release": "%s-%s-1"}\n' "$SHA" "$SHA" "$(date +%s)" > "$WORK/dist/deployment.json"
(cd "$WORK" && COPYFILE_DISABLE=1 tar --exclude='__pycache__' -czf release.tgz dist data/catalog.sqlite3 server/catalog_server.py)
for attempt in 1 2 3 4 5 6; do
  if out=$(ssh "$HOST" "sudo -n /usr/local/sbin/fe-guide-deploy" < "$WORK/release.tgz" 2>&1); then echo "$out" | tail -1; break; fi
  echo "$out" | tail -1
  # BlockingIOError: another deploy holds the server lock; wait and retry.
  echo "$out" | grep -q BlockingIOError && [ $attempt -lt 6 ] || exit 1
  sleep 30
done
live=$(curl -fsS "$SITE/deployment.json" | python3 -c 'import json,sys;print(json.load(sys.stdin)["sha"])')
[ "$live" = "$SHA" ] && echo "Live: ${SHA:0:7}" || { echo "Live sha is $live, expected $SHA" >&2; exit 1; }

#!/bin/bash
# Deploy the Sports Jedi API from this Mac to the Oracle server.
#
#   bash ~/sportsjedi-work/backend/scripts/deploy-server.sh
#
# 1. Backs up the server's current src/ to ~/deploy-backups/sports-jedi-<time>.tgz
# 2. Uploads backend/src (adds/updates files, never deletes)
# 3. Restarts the service and checks the existing site routes plus /v1
# 4. Restores the backup automatically if any check fails
set -euo pipefail

KEY="$HOME/.ssh/imali_oracle_new"
SERVER="opc@129.213.90.84"
SRC="$(cd "$(dirname "$0")/.." && pwd)/src/"
TS=$(date +%Y%m%d-%H%M%S)
SSH=(ssh -o BatchMode=yes -i "$KEY" "$SERVER")

echo "== Running tests first"
(cd "$(dirname "$0")/.." && npm test >/tmp/sj-test.log 2>&1) || { echo "Tests failed, not deploying. See /tmp/sj-test.log"; exit 1; }

echo "== Backing up server code ($TS)"
"${SSH[@]}" "cd ~/sports-jedi && mkdir -p ~/deploy-backups && tar czf ~/deploy-backups/sports-jedi-$TS.tgz src package.json package-lock.json && chmod 600 ~/deploy-backups/sports-jedi-$TS.tgz"

echo "== Uploading"
rsync -a --itemize-changes -e "ssh -o BatchMode=yes -i $KEY" "$SRC" "$SERVER:~/sports-jedi/src/" | grep -v '^\.' || true

echo "== Restarting and checking"
"${SSH[@]}" "bash -s" "$TS" <<'REMOTE'
set -u
TS="$1"
rollback() {
  echo "!!! ROLLING BACK: $1"
  tar xzf ~/deploy-backups/sports-jedi-$TS.tgz -C ~/sports-jedi src
  sudo systemctl restart sports-jedi
  sleep 4
  echo "after rollback: $(systemctl is-active sports-jedi)"
  exit 1
}
sudo systemctl restart sports-jedi
for i in $(seq 1 15); do curl -sf -m 3 http://127.0.0.1:4100/api/health >/dev/null && break; sleep 1; done
[ "$(systemctl is-active sports-jedi)" = "active" ] || rollback "service not active"

code() { curl -s -o /dev/null -w '%{http_code}' -m 20 "$@"; }
for p in "/api/health" "/api/games?league=NFL" "/api/picks?league=NCAAF" "/api/blog" "/sitemap.xml"; do
  c=$(code "http://127.0.0.1:4100$p"); echo "$p -> $c"; [ "$c" = "200" ] || rollback "$p returned $c"
done
c=$(code "http://127.0.0.1:4100/api/account/me"); echo "/api/account/me -> $c"; [ "$c" = "401" ] || rollback "account route changed"
c=$(code http://127.0.0.1:4100/v1/docs); echo "/v1/docs -> $c"; [ "$c" = "200" ] || rollback "docs"
c=$(code http://127.0.0.1:4100/api/developer/plans); echo "/api/developer/plans -> $c"; [ "$c" = "200" ] || rollback "plans"
# A well-formed unknown key creates the API tables and runs the key lookup on the real database.
R=$(curl -s -m 20 -H "X-API-Key: sj_live_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" http://127.0.0.1:4100/v1/picks)
echo "/v1/picks (unknown key) -> $R"
echo "$R" | grep -q INVALID_API_KEY || rollback "API key lookup failed"
echo "--- errors logged since restart:"
sudo journalctl -u sports-jedi --since "-2 min" --no-pager | grep -iE "error|exception|unhandled" | tail -5 || true
echo "DEPLOY OK (backup: ~/deploy-backups/sports-jedi-$TS.tgz)"
REMOTE

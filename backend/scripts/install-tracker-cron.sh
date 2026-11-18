#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
NODE=$(command -v node)
[ -n "$NODE" ] || { echo "Node.js is required"; exit 1; }
mkdir -p "$ROOT/data"
# Run every 30 minutes. Requires persistent storage and network access.
LINE="*/30 * * * * cd $ROOT && $NODE scripts/track-predictions.mjs >> $ROOT/data/tracker.log 2>&1"
echo "Proposed crontab entry:"
echo "$LINE"
echo
echo "To install manually on the production host, add the line above with: crontab -e"
echo "This script intentionally does not modify the active crontab."

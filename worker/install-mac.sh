#!/bin/bash
# Installs the analysis worker on this Mac and runs it every 5 minutes (launchd).
# Usage: bash worker/install-mac.sh <SITE_URL> <WORKER_TOKEN>
# Remove: bash worker/install-mac.sh --uninstall
set -euo pipefail
LABEL="com.spiral-questionnaire.worker"
DIR="$HOME/.spiral-worker"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

if [ "${1:-}" = "--uninstall" ]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"
  echo "removed schedule (files kept in $DIR)"
  exit 0
fi

SITE_URL="${1:?SITE_URL required}"
WORKER_TOKEN="${2:?WORKER_TOKEN required}"
NODE="$(command -v node)"

mkdir -p "$DIR"
cp "$(dirname "$0")/spiral-worker.mjs" "$DIR/spiral-worker.mjs"
umask 077
printf '{"SITE_URL":"%s","WORKER_TOKEN":"%s","ENGINES":"claude,codex"}\n' "$SITE_URL" "$WORKER_TOKEN" > "$DIR/config.json"

mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>$NODE</string><string>$DIR/spiral-worker.mjs</string></array>
  <key>StartInterval</key><integer>300</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$DIR/launchd.out.log</string>
  <key>StandardErrorPath</key><string>$DIR/launchd.err.log</string>
</dict>
</plist>
PL
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "installed: runs every 5 minutes. log: $DIR/worker.log"

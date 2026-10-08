#!/bin/bash
# Installs the analysis worker on this Mac (launchd):
#   - every day at 08:00 and 20:00: analyzes everything waiting in the queue
#   - every hour: checks only whether the admin pressed "analyze now" (no Claude usage unless there is a request)
# Usage:  bash worker/install-mac.sh <SITE_URL> <WORKER_TOKEN>
# Remove: bash worker/install-mac.sh --uninstall
set -euo pipefail
DIR="$HOME/.spiral-worker"
AGENTS="$HOME/Library/LaunchAgents"
L_SCHED="com.spiral-questionnaire.worker.scheduled"
L_NOW="com.spiral-questionnaire.worker.ondemand"

unload() { launchctl bootout "gui/$(id -u)/$1" 2>/dev/null || true; }

if [ "${1:-}" = "--uninstall" ]; then
  unload "$L_SCHED"; unload "$L_NOW"
  rm -f "$AGENTS/$L_SCHED.plist" "$AGENTS/$L_NOW.plist"
  echo "removed schedule (files kept in $DIR)"
  exit 0
fi

SITE_URL="${1:?SITE_URL required}"
WORKER_TOKEN="${2:?WORKER_TOKEN required}"
NODE="$(command -v node)"

mkdir -p "$DIR" "$AGENTS"
cp "$(dirname "$0")/spiral-worker.mjs" "$DIR/spiral-worker.mjs"
( umask 077; printf '{"SITE_URL":"%s","WORKER_TOKEN":"%s","ENGINES":"claude,codex"}\n' "$SITE_URL" "$WORKER_TOKEN" > "$DIR/config.json" )

plist() { # label scope trigger-xml
  cat > "$AGENTS/$1.plist" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$1</string>
  <key>ProgramArguments</key>
  <array><string>$NODE</string><string>$DIR/spiral-worker.mjs</string><string>--scope=$2</string></array>
  $3
  <key>StandardOutPath</key><string>$DIR/launchd.out.log</string>
  <key>StandardErrorPath</key><string>$DIR/launchd.err.log</string>
</dict>
</plist>
PL
  unload "$1"
  launchctl bootstrap "gui/$(id -u)" "$AGENTS/$1.plist"
}

plist "$L_SCHED" all '<key>StartCalendarInterval</key>
  <array>
    <dict><key>Hour</key><integer>8</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Hour</key><integer>20</integer><key>Minute</key><integer>0</integer></dict>
  </array>'
plist "$L_NOW" now '<key>StartInterval</key><integer>3600</integer>
  <key>RunAtLoad</key><true/>'

echo "installed: full run at 08:00 and 20:00, on-demand check every hour. log: $DIR/worker.log"

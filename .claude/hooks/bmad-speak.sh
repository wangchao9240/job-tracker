#!/usr/bin/env bash
set -euo pipefail

agent_id="${1:-unknown}"
shift || true
text="${*:-}"

mkdir -p "$(dirname "$0")"

timestamp="$(date -Is 2>/dev/null || date)"
printf '%s\t%s\t%s\n' "$timestamp" "$agent_id" "$text" >> "$(dirname "$0")/tts.log"

if command -v say >/dev/null 2>&1; then
  say "$text" >/dev/null 2>&1 || true
fi

exit 0

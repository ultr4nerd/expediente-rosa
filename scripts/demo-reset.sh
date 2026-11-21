#!/usr/bin/env bash
# Resets the live demo: stops the app instances, flushes the central (Valkey), wipes both
# local data dirs and starts the central again. Fictitious data only.
#   scripts/demo-reset.sh            reset and leave the central running
#   scripts/demo-reset.sh --down     reset and leave the central stopped (offline part of the demo)
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f server/compose.yaml)
DATA_A=${ER_DATA_A:-/tmp/er-a}
DATA_B=${ER_DATA_B:-/tmp/er-b}

echo "› Closing running Expediente Rosa instances"
pkill -f "tauri dev" 2>/dev/null || true   # its watcher would relaunch the app
pkill -f "target/debug/expediente-rosa" 2>/dev/null || true
pkill -f "target/release/expediente-rosa" 2>/dev/null || true

echo "› Flushing the central"
"${COMPOSE[@]}" up -d --wait valkey
"${COMPOSE[@]}" exec -T valkey valkey-cli FLUSHALL >/dev/null
# Start the yearly counter after the seed's historical folios so the demo shows 2026-0143, 2026-0144
# (the pitch script). Seed folios are <year>-01NN and live only on the laptops.
"${COMPOSE[@]}" exec -T valkey valkey-cli SET "{er}:folio:$(date +%Y)" "${ER_FOLIO_START:-142}" >/dev/null
"${COMPOSE[@]}" down

echo "› Wiping local data: $DATA_A $DATA_B"
rm -rf "$DATA_A" "$DATA_B"

if [[ "${1:-}" != "--down" ]]; then
  echo "› Starting the central (http://localhost:8787)"
  "${COMPOSE[@]}" up -d --build --wait
  curl -fsS --retry 10 --retry-connrefused --retry-delay 1 http://localhost:8787/health && echo
fi

cat <<MSG
Done. Start the two laptops:
  A: ER_DATA_DIR=$DATA_A ER_DEVICE=A pnpm tauri dev
  B: ER_DATA_DIR=$DATA_B ER_DEVICE=B src-tauri/target/debug/expediente-rosa   (after A is up: reuses Vite on :1420)
Central off/on during the demo:
  docker compose -f server/compose.yaml stop server   /   docker compose -f server/compose.yaml start server
MSG

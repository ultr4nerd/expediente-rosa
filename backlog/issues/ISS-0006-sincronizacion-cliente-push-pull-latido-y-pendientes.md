---
id: ISS-0006
title: "Client sync: push, pull, heartbeat and pending count"
kind: feature
status: done
priority: P0
area: rust
parent: ISS-0001
depends_on: [ISS-0002, ISS-0005]
created: 2026-11-21
updated: 2026-11-21
due:
owner:
branch:
estimate: M
tags: []
---

## Context
Rust sync command using reqwest against the central server; heartbeat to /health; status indicator in the UI ("En línea", "Sin conexión", "N pendientes").

## Scope

## Acceptance criteria
- [x] an event created on instance A shows up on B after syncing
- [x] without the central server, data entry continues and the pending counter goes up
- [x] when the central server returns, pending drops to 0

## Notes

## Log
- 2026-11-21 11:58 thread-a: started; plan in progress/ISS-0006.md
- 2026-11-21 11:58 thread-a: started before ISS-0005 lands (as instructed): built against the contract with a local mock central; branched from iss-0002, rebase on main once #1 merges
- 2026-11-21 12:05 thread-a: learning: docs/learnings/0001-tailwind-max-w-sizes-collide-with-spacing-tokens-native-date-inputs-are-unreliable.md (already filed by another thread)
- 2026-11-21 12:05 thread-a: sync_now/sync_status + SyncIndicator/SyncScreen done. Verified: cargo E2E test two encrypted stores A/B exchange events via a contract mock (pending 0, idempotent); offline test keeps pending; real Tauri window shows 'En línea' against thread B's running central (no events pushed to it). Pending: two-GUI demo against the real central once server/ is on main
- 2026-11-21 12:07 thread-a: E2E against the real server/ code (isolated Valkey :6390, server :8799): A/B exchange events, pending 0, folios 2026-0001/0002 reach both
- 2026-11-21 12:07 thread-a: verify passed: pnpm verify
- 2026-11-21 12:07 thread-a: done: Shipped Rust sync_now/sync_status (src-tauri/src/sync.rs: 2 s health check, push in batches of 200 marking accepted+d...

## Outcome
Shipped Rust sync_now/sync_status (src-tauri/src/sync.rs: 2 s health check, push in batches of 200 marking accepted+duplicates synced, pull after remote_cursor with INSERT OR IGNORE synced=1, last_sync_at in meta, runs serialized), SyncIndicator (shared 10 s poller, click = sync now, online/offline/N pendientes + last time) and SyncScreen (central URL, default http://localhost:8787, last sync, pending, Sincronizar ahora). Verified: cargo test two_devices against both a contract mock and an isolated copy of thread B's real central (two encrypted stores exchange events, pending drops to 0, both receive folio.assigned 2026-0001/0002, second sync idempotent); offline test keeps events pending with connectivity offline; real Tauri window shows En línea and the sync screen against the demo central. Untested: two GUI instances creating patients end to end (patient form belongs to another issue). Learning: max-w size names hit spacing tokens (already in docs/learnings/0001).

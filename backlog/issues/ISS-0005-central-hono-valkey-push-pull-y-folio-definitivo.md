---
id: ISS-0005
title: "Hono + Valkey central server: push, pull and final folio"
kind: feature
status: done
priority: P0
area: server
parent: ISS-0001
depends_on: []
created: 2026-11-21
updated: 2026-11-21
due:
owner:
branch:
estimate: M
tags: []
---

## Context
server/ with docker compose (valkey with appendonly yes, appendfsync always). POST /events (atomic dedup SET NX + XADD in a script), GET /events?after=<id>, folio assignment with INCR folio:<year> emitting folio.assigned, GET /health. Decision 0004.

## Scope

## Acceptance criteria
- [x] repeated push does not duplicate events (test)
- [x] pull from a cursor returns only new events
- [x] every patient.created without a folio gets a consecutive folio.assigned with no gaps or collisions
- [x] docker compose up brings everything up

## Notes

## Log
- 2026-11-21 11:55 thread-b: started; plan in progress/ISS-0005.md
- 2026-11-21 11:59 thread-b: server/ built: Hono + iovalkey, one atomic Lua script per event (SET NX dedup, XADD, HEXISTS/INCR/HSET folio, server-authored folio.assigned XADD); compose with valkey 8.1 AOF always
- 2026-11-21 11:59 thread-b: 10 vitest integration tests green against real Valkey (DB 15); curl smoke against docker compose server incl. CORS preflight; root pnpm verify green (server tests named *.itest.ts so root vitest skips them)
- 2026-11-21 11:59 thread-b: verify passed: pnpm verify
- 2026-11-21 11:59 thread-b: done: Shipped server/ (standalone npm package): GET /health, POST /events, GET /events?after=, plus GET /stats. One Lua scr...

## Outcome
Shipped server/ (standalone npm package): GET /health, POST /events, GET /events?after=, plus GET /stats. One Lua script per event does SET NX dedup + XADD and, for patient.created, assigns the yearly folio (INCR er:folio:<year>, idempotent via er:folio:by-patient) and appends a central-authored folio.assigned, all atomically. Year taken from the event's at string. Valkey runs with appendonly yes + appendfsync always on a named volume. Verified: 10 integration tests against real Valkey (duplicate push, 2026-0001/0002 in both orders, no double folio, year rollover, cursor pull, forged folio.assigned rejected, stats), curl smoke on docker compose, root pnpm verify green. Follow-ups: auth/TLS, stream archiving, hash tags if cluster mode is ever needed.

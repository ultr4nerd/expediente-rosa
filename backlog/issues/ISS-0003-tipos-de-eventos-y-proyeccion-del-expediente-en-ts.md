---
id: ISS-0003
title: Event types and patient-record projection in TS
kind: feature
status: done
priority: P0
area: domain
parent: ISS-0001
depends_on: []
created: 2026-11-21
updated: 2026-11-21
due:
owner:
branch:
estimate: S
tags: []
---

## Context
src/domain: types for the spec's events, a pure deterministic projection (ordered by at,id; idempotent), EventStore and SyncTransport interfaces with an in-memory adapter. Decision 0002.

## Scope

## Acceptance criteria
- [x] types for every event in the spec
- [x] deterministic, idempotent projection with tests
- [x] in-memory EventStore adapter used in tests

## Notes

## Log
- 2026-11-21 11:56 thread-c: started; plan in progress/ISS-0003.md
- 2026-11-21 11:58 thread-c: projection.ts (pure, (at,id)-ordered, idempotent; links, aliases, distinct pairs, timeline) + app/useRecords.ts shared source; 11 tests
- 2026-11-21 11:58 thread-c: verify passed: pnpm verify
- 2026-11-21 11:58 thread-c: done: Shipped src/domain/projection.ts: project(events) -> RecordsModel (patients with identity+field history and per-field...

## Outcome
Shipped src/domain/projection.ts: project(events) -> RecordsModel (patients with identity+field history and per-field conflict flag, final/provisional folio + aliases, privacy, stable history, linked/alias status resolved to root with merged visits/timeline, distinct pairs, visits->services->results, Spanish timeline labels), plus findByFolio/resolvePatient/areMarkedDistinct/servicesOf. src/app/useRecords.ts: shared source per store (useSyncExternalStore) with refresh() and append(). Verified with Vitest: determinism under shuffling, idempotency under duplicates, clock skew, link chains/cycles, distinct marks. Follow-up: per-field conflict UI (ISS-0020) can read FieldChange.conflict.

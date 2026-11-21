---
id: ISS-0004
title: Fictional seed data
kind: feature
status: done
priority: P0
area: domain
parent: ISS-0001
depends_on: [ISS-0003]
created: 2026-11-21
updated: 2026-11-21
due:
owner:
branch:
estimate: S
tags: []
---

## Context
~30 fictional patients with prior visits; includes María Ejemplo (Pap smear in February) and María Ejemplar (similar name, different person).

## Scope

## Acceptance criteria
- [x] seed loadable from the UI or on first launch
- [x] María Ejemplo has a prior *citología* (Pap smear) with a cytology number
- [x] María Ejemplar exists with a different date of birth

## Notes

## Log
- 2026-11-21 11:58 thread-c: started; plan in progress/ISS-0004.md
- 2026-11-21 12:00 thread-c: verify passed: pnpm verify
- 2026-11-21 12:00 thread-c: done: Shipped src/domain/seed.ts: seedEvents() returns 30 fictitious patients (Mexican names, Jalisco municipalities, 34155...

## Outcome
Shipped src/domain/seed.ts: seedEvents() returns 30 fictitious patients (Mexican names, Jalisco municipalities, 341555XXXX phones) across 4 past jornadas, with privacy, stable history, one visit each, citología (cytologyNumber CIT-YYYY-NNNN, Bethesda result) and/or revisión mamaria (some with prior mammogram, BIRADS result), final folios, and one phone change. Deterministic ids (seed-NNN-NN) from device S. María Ejemplo (seed-patient-001, Pap 2026-02-12) and María Ejemplar (seed-patient-002, different birth date). seedIfEmpty(store) for first launch. Verified with Vitest (determinism, unique ids, demo pair, seedIfEmpty once). Follow-up: UI must call seedIfEmpty(platform.store) on startup, then refresh records.

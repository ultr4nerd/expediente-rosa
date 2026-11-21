---
id: ISS-0009
title: Search and human confirmation
kind: feature
status: done
priority: P0
area: ui
parent: ISS-0001
depends_on: [ISS-0007, ISS-0008]
created: 2026-11-21
updated: 2026-11-21
due:
owner:
branch:
estimate: M
tags: []
---

## Context
Search with match cards that show the reason why; buttons 'Es la misma persona' (same person) and 'Es otra persona' (different person; records patients.marked_distinct).

## Scope

## Acceptance criteria
- [x] searching with a typo shows candidates with reasons
- [x] confirming opens the patient record
- [x] 'otra persona' is recorded and the pair is not suggested again
- [x] manual review in the app

## Notes

## Log
- 2026-11-21 12:03 thread-d: started; plan in progress/ISS-0009.md
- 2026-11-21 12:07 thread-d: Search + match cards against typed stub; keyboard flow checked in browser
- 2026-11-21 12:07 thread-d: verify passed: pnpm verify
- 2026-11-21 12:07 thread-d: done: Shipped `src/screens/SearchScreen.tsx`, `src/components/MatchCard.tsx` and a temporary typed matcher `src/components/...

## Outcome
Shipped `src/screens/SearchScreen.tsx`, `src/components/MatchCard.tsx` and a temporary typed matcher `src/components/MatchStub.ts` (+ tests). One box searches by name (typos, accents, «Ma.», surname order), folio (with or without leading zeros, provisional or final) or phone (full or last 4 digits), optionally with a DD/MM/AAAA date. Each card shows age, birth date, community, folio (provisional dashed / final solid) and the list "Por qué coincide". "Es la misma persona" opens the record; "Es otra persona" collapses the card (with Deshacer) and, once the user picks the right one, records `patients.marked_distinct` for each dismissed candidate. Pairs already marked distinct from the top match go last with a note. Empty states use `estado-vacio.webp`; "Registrar nueva paciente" is always one click away and becomes the primary action when nothing matches. Never merges.
Verified: `pnpm verify` green; manual keyboard run in `pnpm dev` with 3 fictitious patients: "Maria Ejenplo" → María Ejemplo Ruiz ("1 letra distinta") and María Ejemplar Soto ("3 letras distintas"); ↓ ↓ Tab Enter dismissed Ejemplar; Enter on Ejemplo opened the record, toast "Anotado: María Ejemplar Soto es otra persona." and the store holds the `patients.marked_distinct` event; searching again lists Ejemplar last with "Ya se confirmó que es otra persona que María Ejemplo Ruiz."
Follow-ups: replace MatchStub with `src/domain/matching.ts` (ISS-0007) and the projection/useRecords (ISS-0003), then delete the stub and its test. If the user dismisses candidates and then registers a new patient, nothing is recorded (the new patient id does not exist yet; would need a route param, a shared-file change).

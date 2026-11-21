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
Shipped `src/screens/SearchScreen.tsx` and `src/components/MatchCard.tsx` on top of thread C's `src/domain/matching.ts` (ISS-0007) and `useRecords()` (ISS-0003); the temporary stub used while they were in flight was deleted before the PR. One box searches by folio (current or previous, `s-1` → "Folio anterior S-0001 (ahora 2026-0101)"), or by name with optional DD/MM/AAAA date and phone digits (last 4). Each card shows age, birth date, community, folio (provisional dashed / final solid) and "Por qué coincide" (reasons against the match are muted with a minus icon). "Es la misma persona" opens the record; "Es otra persona" collapses the card (with Deshacer) and, once the right patient is picked, records `patients.marked_distinct` for each dismissed candidate. Pairs already marked distinct from the top match go last with a note. Empty states use `estado-vacio.webp`; "Registrar nueva paciente" is always one click away and becomes the primary action when nothing matches. Never merges.
Verified: `pnpm verify` green (42 tests). Manual in `pnpm dev`: with 3 fictitious patients, keyboard only (↓ ↓ Tab Enter, Enter) dismissed Ejemplar, opened Ejemplo, toast "Anotado: María Ejemplar Soto es otra persona.", event present in the store, and the next search lists Ejemplar last with the note. With `seedEvents()` and the real matcher: "Maria Ejenplo" → María Ejemplo (97 %) and María Ejemplar (92 %); "0142" → last-4 phone; "Ma. Ejemplo 18/04/1979" → "Mismo nombre / Misma fecha de nacimiento" vs "Nombre 96 % parecido / Fecha de nacimiento distinta"; "xqzv" → empty state.
Follow-ups: dismissing candidates and then registering a new patient records nothing (no patient id yet; would need a route param in `src/app/navigation.tsx`).

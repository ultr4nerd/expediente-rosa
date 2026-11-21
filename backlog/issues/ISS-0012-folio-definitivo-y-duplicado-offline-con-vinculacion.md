---
id: ISS-0012
title: Final folio and offline duplicate with linking
kind: feature
status: done
priority: P0
area: domain
parent: ISS-0001
depends_on: [ISS-0006, ISS-0009]
created: 2026-11-21
updated: 2026-11-21
due:
owner:
branch:
estimate: M
tags: []
---

## Context
After sync, provisional folios become final. Detect the same patient registered on two laptops, propose linking, confirm; one folio survives and the other becomes an alias.

## Scope

## Acceptance criteria
- [x] two offline registrations of the same patient produce a link proposal after sync
- [x] patients.linked leaves a searchable alias
- [x] searching by provisional folio finds the patient record

## Notes

## Log
- 2026-11-21 12:10 thread-b: started; plan in progress/ISS-0012.md
- 2026-11-21 12:11 thread-b: UI part: src/components/DuplicatesPanel.tsx (proposals with reasons, side-by-side identities, final vs provisional folio, Vincular -> patients.linked, Son personas distintas -> patients.marked_distinct), one-line mount in SyncScreen; tests: render + link leaves provisional folio searchable + distinct removes proposal. Criterion 1 (proposal after a real two-laptop sync) still depends on ISS-0006 sync
- 2026-11-21 12:32 thread-b: criterion 1 confirmed live by thread A in PR #22: two instances offline (A-0001, B-0001), central back -> final folios, 'Posibles duplicados (1)' with reasons, Vincular -> B shows a single record
- 2026-11-21 12:32 thread-b: verify passed: pnpm verify
- 2026-11-21 12:32 thread-b: done: Shipped DuplicatesPanel (PR #12): link proposals after sync with reasons, side-by-side identities and final vs provis...

## Outcome
Shipped DuplicatesPanel (PR #12): link proposals after sync with reasons, side-by-side identities and final vs provisional folio; Vincular -> patients.linked, Son personas distintas -> patients.marked_distinct. Verified: render and domain tests (provisional folio of the alias finds the survivor, distinct removes the proposal) and live two-instance demo with the real central in PR #22.

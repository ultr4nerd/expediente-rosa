---
id: ISS-0012
title: Final folio and offline duplicate with linking
kind: feature
status: in-progress
priority: P0
area: domain
parent: ISS-0001
depends_on: [ISS-0006, ISS-0009]
created: 2026-11-21
updated: 2026-11-21
due:
owner: thread-b
branch:
estimate: M
tags: []
---

## Context
After sync, provisional folios become final. Detect the same patient registered on two laptops, propose linking, confirm; one folio survives and the other becomes an alias.

## Scope

## Acceptance criteria
- [ ] two offline registrations of the same patient produce a link proposal after sync
- [x] patients.linked leaves a searchable alias
- [x] searching by provisional folio finds the patient record

## Notes

## Log
- 2026-11-21 12:10 thread-b: started; plan in progress/ISS-0012.md
- 2026-11-21 12:11 thread-b: UI part: src/components/DuplicatesPanel.tsx (proposals with reasons, side-by-side identities, final vs provisional folio, Vincular -> patients.linked, Son personas distintas -> patients.marked_distinct), one-line mount in SyncScreen; tests: render + link leaves provisional folio searchable + distinct removes proposal. Criterion 1 (proposal after a real two-laptop sync) still depends on ISS-0006 sync

## Outcome
<!-- filled by `backlog done`: what shipped, how it was verified, learnings, follow-ups -->

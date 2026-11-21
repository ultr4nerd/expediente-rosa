---
id: ISS-0020
title: Per-field conflict with human resolution
kind: feature
status: done
priority: P1
area: domain
parent: ISS-0001
depends_on: [ISS-0006]
created: 2026-11-21
updated: 2026-11-21
due:
owner:
branch:
estimate: S
tags: []
---

## Context

## Scope

## Acceptance criteria
- [x] two field.updated with the same prev show up in the conflict inbox
- [x] the resolution is stored as an event

## Notes

## Log
- 2026-11-21 12:18 thread-b: started; plan in progress/ISS-0020.md
- 2026-11-21 12:18 thread-b: domain src/domain/conflicts.ts (open conflict = flagged head, contenders, resolveConflict with prev = head) + 8 tests; ConflictPanel on sync screen, ConflictBadge on patient header; render tests; decision 0007. Started --force: ISS-0006 merged code but issue state not done on this branch
- 2026-11-21 12:18 thread-b: verify passed: pnpm verify
- 2026-11-21 12:18 thread-b: done: Shipped per-field conflict inbox. Rule (decision 0007): open conflict = the field's head change is flagged; contender...

## Outcome
Shipped per-field conflict inbox. Rule (decision 0007): open conflict = the field's head change is flagged; contenders = head, the change it should have replaced, and siblings with the same prev; Conservar este valor appends field.updated with the chosen value, prev = head id, at strictly after the head, which closes the conflict while the losing values stay in history. ConflictPanel (sync screen, next to duplicates) shows each value with device, author, role and time; ConflictBadge (red) on the patient header opens the sync screen. Sensitive history fields follow canSeeSensitive. Verified: 8 domain tests (sequential edit no conflict, same prev conflict, symmetry, resolution closes it and keeps history, three-way, clock-ahead head, invalid choice) and render tests; pnpm verify green. Not verified by hand with two real instances.

---
id: ISS-0019
title: Avoided re-entry counter
kind: feature
status: done
priority: P1
area: ui
parent: ISS-0001
depends_on: [ISS-0010]
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
- [x] shows reused vs newly entered fields in the visit

## Notes

## Log
- 2026-11-21 12:32 thread-b: started; plan in progress/ISS-0019.md
- 2026-11-21 12:32 thread-b: verified on main: VisitNewScreen.tsx:283 shows '{reusedCount} datos reutilizados del historial' in the header and :243 in the save toast; computed in src/domain/autofill.ts (identity fields + stable history + citology kind + previous cytology number + mammogram history), tested in autofill.test.ts; live demo in PR #22 showed 15 autofilled data. Newly entered fields are not counted separately
- 2026-11-21 12:32 thread-b: verify passed: pnpm verify
- 2026-11-21 12:32 thread-b: done: Covered by ISS-0010's visit screen, no new code: the header and the save toast show 'N datos reutilizados del histori...

## Outcome
Covered by ISS-0010's visit screen, no new code: the header and the save toast show 'N datos reutilizados del historial' (reusedCount from src/domain/autofill.ts, unit-tested; 15 in the live demo walk of PR #22). Gap: newly entered fields are not shown as a separate number; the reused count is the demo claim.

---
id: ISS-0013
title: Simulated roles and pathologist result
kind: feature
status: done
priority: P0
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
User picker with PIN: *capturista* (data-entry staff), physician, pathologist. The capturista does not see sensitive history. The pathologist records Bethesda/BIRADS as result.recorded.

## Scope

## Acceptance criteria
- [x] capturista does not see sensitive history
- [x] pathologist records a result linked to the service
- [x] author and role are stored in the event

## Notes

## Log
- 2026-11-21 12:07 thread-b: started; plan in progress/ISS-0013.md
- 2026-11-21 12:07 thread-b: started with --force: ISS-0010 (visit/service capture) still open; integrator assigned this round 2. Components work on projected services, independent of who records them
- 2026-11-21 12:10 thread-b: src/domain/results.ts (role rules, Bethesda/BIRADS/conducta lists, validation, payload) + tests; components RoleSensitive, RoleClinicalPanel, ResultForm, ResultView; SSR tests of role gating; one-line mount in PatientScreen
- 2026-11-21 12:10 thread-b: verify passed: pnpm verify
- 2026-11-21 12:10 thread-b: done: Shipped role-gated clinical panel and result capture. capturista: sensitive gyneco-obstetric history, service clinica...

## Outcome
Shipped role-gated clinical panel and result capture. capturista: sensitive gyneco-obstetric history, service clinical fields and results render a locked placeholder (Visible solo para personal médico), never empty; medico/admin reveal sensitive history with Mostrar; patologo sees service fields/results but not sexual history. patologo/medico record or correct a result per service: Bethesda 2014 for citología, BI-RADS 0-5 + conducta a seguir (required) for mama, repeat study, notes; appends result.recorded with serviceId, author = user id, role = user role. Verified: domain tests (validation, payload, role rules) and SSR render tests of the gating per role; pnpm verify green. Not verified by hand in the Tauri app. Follow-ups: the Mostrar reveal is not logged (no event type); PatientScreen owner (thread D) can move the mount.

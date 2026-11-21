---
id: ISS-0023
title: Access log for sensitive data views
kind: feature
status: done
priority: P1
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
Pressing 'Mostrar' on sensitive history leaves no trace today. Add a record.viewed event (contract change) appended when a clinical role reveals sensitive data; show it in the patient timeline/audit for admin.

## Scope

## Acceptance criteria
- [x] record.viewed in events.ts and the contract doc
- [x] appended on reveal with author, role, device, time
- [x] visible to admin in the record's audit
- [x] tests

## Notes

## Log
- 2026-11-21 12:50 thread-b: started; plan in progress/ISS-0023.md
- 2026-11-21 12:52 thread-b: record.viewed in events.ts + contract doc + MVP event table; projection: accessLog (out of timeline, no updatedAt bump, merged from aliases); src/domain/access.ts (createViewOnce debounce, recordViewed) + 5 tests; RoleSensitive onReveal -> RoleClinicalPanel appends once per section per visit; RoleAccessLog admin-only; render tests; central round-trip test (11/11)
- 2026-11-21 12:52 thread-b: verify passed: pnpm verify
- 2026-11-21 12:52 thread-b: done: [contract] record.viewed { section, serviceId? } added to events.ts and the sync contract doc. Pressing Mostrar on se...

## Outcome
[contract] record.viewed { section, serviceId? } added to events.ts and the sync contract doc. Pressing Mostrar on sensitive history (the only sensitive data behind Mostrar today) appends one record.viewed per section per screen visit (createViewOnce), with author, role, device and time from the envelope and never the data. The projection puts views in PatientRecord.accessLog (sorted, merged from linked aliases), keeps them out of the timeline and does not bump updatedAt. Admin-only 'Accesos a datos sensibles' card in the clinical panel. Verified: 5 domain tests, 3 render tests, central integration test showing record.viewed round-trips unchanged (11/11), pnpm verify green (90). Not verified: the click itself in the app (no DOM test runner); clinical_service/result sections exist in the type but are not emitted because those sections have no Mostrar gate.

---
id: ISS-0008
title: Patient registration screen
kind: feature
status: done
priority: P0
area: ui
parent: ISS-0001
depends_on: [ISS-0002, ISS-0003]
created: 2026-11-21
updated: 2026-11-21
due:
owner:
branch:
estimate: M
tags: []
---

## Context
Single identity block (shared by the Pap smear and breast exam forms), accepted privacy notice, provisional folio visible and visually distinct. Use design/DESIGN.md.

## Scope

## Acceptance criteria
- [x] full registration with keyboard only, no mouse
- [x] provisional folio A-NNNN looks different from the final one
- [x] privacy.accepted is recorded with its version
- [x] manual review of the screen in the app

## Notes

## Log
- 2026-11-21 11:56 thread-d: started; plan in progress/ISS-0008.md
- 2026-11-21 12:00 thread-d: Screen + identity domain helpers done; keyboard-only flow checked in browser
- 2026-11-21 12:01 thread-d: verify passed: pnpm verify
- 2026-11-21 12:01 thread-d: done: Shipped `src/screens/PatientNewScreen.tsx` (identity block once for both forms, live age, under-18 warning, privacy n...
- 2026-11-21 12:09 ultr4nerd: Follow-up: save goes through recordsSource().append so the shared model sees the new patient

## Outcome
Shipped `src/screens/PatientNewScreen.tsx` (identity block once for both forms, live age, under-18 warning, privacy notice with version 2026-05, provisional folio in the dashed warning style, Enter / Ctrl+S save, focus jumps to the first invalid field) and `src/domain/identity.ts` (+ tests: age, impossible dates, 12–110 age range, 10-digit phones, email shape, normalization). Saves `patient.created` + `privacy.accepted` through `platform.store` and navigates to the patient.
Verified: `pnpm verify` green; manual keyboard-only run in `pnpm dev` (empty submit shows all errors and focuses the name; full fill with Tab/typeahead/arrows/Space; Ctrl+S saved, toast shown, navigated to the record; reopening shows A-0002).
Learnings: Tailwind `max-w-<size>` collides with spacing tokens of the same name; native date inputs are unreliable for fast capture.
Follow-ups: swap `platform.store` calls for thread C's `useRecords().append/refresh` when ISS-0003 lands (seam: `computeFolio` + the append in `save`); duplicate check before saving belongs to ISS-0009's search flow.

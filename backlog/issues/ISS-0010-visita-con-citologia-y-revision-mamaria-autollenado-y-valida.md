---
id: ISS-0010
title: "Visit with Pap smear and breast exam, autofill and validations"
kind: feature
status: done
priority: P0
area: ui
parent: ISS-0001
depends_on: [ISS-0009]
created: 2026-11-21
updated: 2026-11-21
due:
owner:
branch:
estimate: M
tags: []
---

## Context
Reduced *citología* (Pap smear) and *revisión mamaria* (breast exam) forms. Autofill: reactivo 11, 22.1, last mammogram, stable history in confirm mode. Validations for age, dates, height, weight, blood pressure.

## Scope

## Acceptance criteria
- [x] María's second visit opens with identity filled and 'subsecuente' (follow-up) computed
- [x] previous cytology number autofilled
- [x] validation blocks impossible dates and warns on unusual ranges
- [x] autofilled fields are visibly marked

## Notes

## Log
- 2026-11-21 12:06 thread-c: started; plan in progress/ISS-0010.md
- 2026-11-21 12:12 thread-c: verify passed: pnpm verify
- 2026-11-21 12:12 thread-c: done: Shipped src/domain/autofill.ts (computeAutofill: reactivo 11 from last citología date, 22.1 previous cytology number,...

## Outcome
Shipped src/domain/autofill.ts (computeAutofill: reactivo 11 from last citología date, 22.1 previous cytology number, last mammogram date/result, stable history to confirm, identity fields reused, reusedCount; each value with its source label/date/event; validateVisit: blocking errors for impossible/future dates and impossible height/weight/BP/glucose, warnings for unusual ranges and high/low BP; historyChanges for field.updated corrections) and the VisitNewScreen with VisitFields/VisitHistory components: visit data, citología (11,12,15,16,19,21,22,22.1) and revisión mamaria (1,16,16.1,16.2,17,22,23), autofill style 'Del historial' with Confirmar and 'Confirmar todo', history in confirm mode, role-hidden sensitive parts, Ctrl+S, recapture counter. recordsSource() now seeds demo data on an empty store. Minimal 'Nueva visita' button on PatientScreen. Verified: 9 domain tests + SSR render test of María Ejemplo's second visit (subsecuente checked, CIT-2026-0001 prefilled, 'Del historial' shown); not clicked through in a browser.

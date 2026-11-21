---
id: ISS-0022
title: Pending follow-up list
kind: feature
status: done
priority: P1
area: ui
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
EIRA must contact patients who need follow-up. Derive from result.recorded: BIRADS 3 / evaluacion_6_meses, BIRADS 0/4/5, imagen_complementaria, mastografia, repeatStudy, abnormal Bethesda. Show due date and reason; never put findings in any notification.

## Scope

## Acceptance criteria
- [x] list derived from projected results with reason and due date
- [x] opens the patient record
- [x] no diagnosis text outside the clinical roles
- [x] domain tests

## Notes

## Log
- 2026-11-21 12:50 thread-c: started; plan in progress/ISS-0022.md
- 2026-11-21 12:52 thread-c: verify passed: pnpm verify
- 2026-11-21 12:52 thread-c: done: Shipped src/domain/followUp.ts (ruleFor: BIRADS 4-5 suspicious, abnormal Bethesda, BIRADS 0/imagen_complementaria, re...

## Outcome
Shipped src/domain/followUp.ts (ruleFor: BIRADS 4-5 suspicious, abnormal Bethesda, BIRADS 0/imagen_complementaria, repeatStudy, BIRADS 3/evaluacion_6_meses = study date + 6 months, mastografia; most urgent rule per result; a newer study of the same type closes it; survivors only; pendingFollowUps sorted overdue first then due date and priority; nextSuggestedVisit for the Cartilla) and the Seguimiento screen (route follow-up, nav entry) with patient, folio, category (clinical roles) or 'Requiere seguimiento' (capturista), due date and 'Abrir expediente'. Seed: 3 patients (BIRADS 3, BIRADS 0, ASC-US) now appear; seed mama results default to rutina_1_anio. 10 domain tests. Not clicked through in the browser.

---
id: ISS-0011
title: Patient-record timeline and contact change with history
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
Timeline of visits, services and results; editing the phone creates field.updated with prev and shows the history.

## Scope

## Acceptance criteria
- [x] the timeline shows visits and services in order
- [x] changing the phone shows previous value, author and date
- [x] manual review in the app

## Notes

## Log
- 2026-11-21 12:10 thread-d: started; plan in progress/ISS-0011.md
- 2026-11-21 12:13 thread-d: Patient screen + contact history done; checked in browser
- 2026-11-21 12:13 thread-d: verify passed: pnpm verify
- 2026-11-21 12:13 thread-d: done: Shipped `src/screens/PatientScreen.tsx` (header with name, age, community, provisional/final folio and "Nueva visita"...

## Outcome
Shipped `src/screens/PatientScreen.tsx` (header with name, age, community, provisional/final folio and "Nueva visita"; identity card with privacy notice status; visits with services and results; full timeline newest first with author and laptop) and `src/components/PatientContact.tsx` (phone, other phone and email: "Cambiar" → inline edit, Enter saves / Esc cancels, 10-digit and email validation, appends `field.updated` with `prev` = last change of that field or the `patient.created` id; "Ver historial" lists every value with "Registro inicial"/"Cambio", author and date; warns when the projection flags a concurrent-edit conflict). Results show Bethesda/BIRADS/follow-up only to roles allowed by `canSeeSensitive`; others see "Resultado registrado · oculto para tu rol". Linked aliases resolve to the survivor with a banner.
Verified: `pnpm verify` green (42 tests). Manual in `pnpm dev` as Dra. Ana Robles: registered a patient, appended a February visit + citología + result; phone changed by keyboard (Cambiar, type, Enter) → toast "Teléfono actualizado. El anterior queda en el historial.", history shows "222 999 8877 · actual — Cambio · Dra. Ana Robles · 21 nov 2026, 12:12" over "222 123 4567 — Registro inicial"; timeline in order (Cambio de teléfono, Aviso de privacidad aceptado, Alta de paciente, Resultado de citología, Citología, Visita registrada); visit card shows the result.
Not tested: capturista view of results (code path only), conflict banner (needs two devices).

---
id: ISS-0018
title: Printable contingency sheet
kind: feature
status: done
priority: P1
area: ui
parent: ISS-0001
depends_on: [ISS-0008]
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
- [x] prints a form with folio and identity fields
- [x] later data entry marked as entered from paper

## Notes

## Log
- 2026-11-21 12:24 thread-c: started; plan in progress/ISS-0018.md
- 2026-11-21 12:28 thread-c: verify passed: pnpm verify
- 2026-11-21 12:28 thread-c: done: Shipped printable contingency sheets (Sincronización -> 'Hoja de contingencia'): full-page overlay, N sheets, each wi...

## Outcome
Shipped printable contingency sheets (Sincronización -> 'Hoja de contingencia'): full-page overlay, N sheets, each with a pre-filled paper folio (own series PA-0001 per laptop, after typed-in ones and the last printed number kept per laptop), identity block, privacy acceptance, visit basics; window.print() with print: variants (app hidden, one sheet per page, black on white; design/targets/print.md). Later entry: 'Viene de hoja de contingencia' + folio on Nueva paciente appends field.updated intake.paperFolio; projection exposes intake, adds the paper folio as searchable alias and a timeline entry 'Capturada desde hoja de papel PA-0003'; matching accepts PA- folios. Verified with domain tests; print preview not checked in a real printer or in Tauri.

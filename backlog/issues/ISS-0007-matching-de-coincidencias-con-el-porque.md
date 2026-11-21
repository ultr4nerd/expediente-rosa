---
id: ISS-0007
title: Match candidates with the reason why
kind: feature
status: done
priority: P0
area: domain
parent: ISS-0001
depends_on: [ISS-0003]
created: 2026-11-21
updated: 2026-11-21
due:
owner:
branch:
estimate: S
tags: []
---

## Context
Spanish-aware normalization (accents, Ma.→María, surname order), Jaro-Winkler, date of birth, last 4 phone digits, municipality, a CURP-like key without homoclave used only for blocking. Returns a score and human-readable reasons.

## Scope

## Acceptance criteria
- [x] 'Maria Ejenplo' finds María Ejemplo and María Ejemplar with different reasons (test)
- [x] never returns an automatic action, only candidates
- [x] normalization tests with accents and abbreviations

## Notes

## Log
- 2026-11-21 12:00 thread-c: started; plan in progress/ISS-0007.md
- 2026-11-21 12:02 thread-c: verify passed: pnpm verify
- 2026-11-21 12:02 thread-c: done: Shipped src/domain/matching.ts: Spanish normalization (accents, Ma./Gpe./Lupe expansion, connectors de/del/la dropped...

## Outcome
Shipped src/domain/matching.ts: Spanish normalization (accents, Ma./Gpe./Lupe expansion, connectors de/del/la dropped), Jaro-Winkler with order-independent token alignment, close-date detection (one digit / swapped day-month), last-4 phone, municipality, CURP-like 16-char key (sex M, state code; labelled as calculated, not official). matchPatients returns ranked {score, Spanish reasons, signals}; never an action; skips aliases, self and pairs marked distinct; very similar names always shown. searchByFolio/searchPatients find by final, provisional or alias folio (a7 -> A-0007). Structural MatchCandidate type so it does not depend on PR #2; PatientRecord satisfies it. 12 Vitest tests incl. 'Maria Ejenplo' finding both Marías with different reasons.

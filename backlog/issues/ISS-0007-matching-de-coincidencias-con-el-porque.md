---
id: ISS-0007
title: Match candidates with the reason why
kind: feature
status: todo
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
- [ ] 'Maria Ejenplo' finds María Ejemplo and María Ejemplar with different reasons (test)
- [ ] never returns an automatic action, only candidates
- [ ] normalization tests with accents and abbreviations

## Notes

## Log

## Outcome
<!-- filled by `backlog done`: what shipped, how it was verified, learnings, follow-ups -->

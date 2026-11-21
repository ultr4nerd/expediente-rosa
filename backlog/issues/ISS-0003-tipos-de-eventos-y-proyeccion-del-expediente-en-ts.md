---
id: ISS-0003
title: Event types and patient-record projection in TS
kind: feature
status: todo
priority: P0
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
src/domain: types for the spec's events, a pure deterministic projection (ordered by at,id; idempotent), EventStore and SyncTransport interfaces with an in-memory adapter. Decision 0002.

## Scope

## Acceptance criteria
- [ ] types for every event in the spec
- [ ] deterministic, idempotent projection with tests
- [ ] in-memory EventStore adapter used in tests

## Notes

## Log

## Outcome
<!-- filled by `backlog done`: what shipped, how it was verified, learnings, follow-ups -->

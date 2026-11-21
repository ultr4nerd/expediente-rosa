---
id: ISS-0005
title: "Hono + Valkey central server: push, pull and final folio"
kind: feature
status: todo
priority: P0
area: server
parent: ISS-0001
depends_on: []
created: 2026-11-21
updated: 2026-11-21
due:
owner:
branch:
estimate: M
tags: []
---

## Context
server/ with docker compose (valkey with appendonly yes, appendfsync always). POST /events (atomic dedup SET NX + XADD in a script), GET /events?after=<id>, folio assignment with INCR folio:<year> emitting folio.assigned, GET /health. Decision 0004.

## Scope

## Acceptance criteria
- [ ] repeated push does not duplicate events (test)
- [ ] pull from a cursor returns only new events
- [ ] every patient.created without a folio gets a consecutive folio.assigned with no gaps or collisions
- [ ] docker compose up brings everything up

## Notes

## Log

## Outcome
<!-- filled by `backlog done`: what shipped, how it was verified, learnings, follow-ups -->

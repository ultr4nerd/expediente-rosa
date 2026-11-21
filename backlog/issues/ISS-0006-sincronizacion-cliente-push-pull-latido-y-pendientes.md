---
id: ISS-0006
title: "Client sync: push, pull, heartbeat and pending count"
kind: feature
status: todo
priority: P0
area: rust
parent: ISS-0001
depends_on: [ISS-0002, ISS-0005]
created: 2026-11-21
updated: 2026-11-21
due:
owner:
branch:
estimate: M
tags: []
---

## Context
Rust sync command using reqwest against the central server; heartbeat to /health; status indicator in the UI ("En línea", "Sin conexión", "N pendientes").

## Scope

## Acceptance criteria
- [ ] an event created on instance A shows up on B after syncing
- [ ] without the central server, data entry continues and the pending counter goes up
- [ ] when the central server returns, pending drops to 0

## Notes

## Log

## Outcome
<!-- filled by `backlog done`: what shipped, how it was verified, learnings, follow-ups -->

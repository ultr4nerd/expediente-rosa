---
id: ISS-0023
title: Access log for sensitive data views
kind: feature
status: todo
priority: P1
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
Pressing 'Mostrar' on sensitive history leaves no trace today. Add a record.viewed event (contract change) appended when a clinical role reveals sensitive data; show it in the patient timeline/audit for admin.

## Scope

## Acceptance criteria
- [ ] record.viewed in events.ts and the contract doc
- [ ] appended on reveal with author, role, device, time
- [ ] visible to admin in the record's audit
- [ ] tests

## Notes

## Log

## Outcome
<!-- filled by `backlog done`: what shipped, how it was verified, learnings, follow-ups -->

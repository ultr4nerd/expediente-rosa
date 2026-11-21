---
id: ISS-0002
title: Encrypted event store in Rust with SQLCipher
kind: feature
status: todo
priority: P0
area: rust
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
Tauri commands append_events and list_events(cursor) over encrypted SQLite. Decisions 0001 and 0005.

## Scope

## Acceptance criteria
- [ ] append_events and list_events(cursor) work from the UI
- [ ] the .db file is unreadable without the key (sqlite3 fails)
- [ ] ER_DATA_DIR and ER_DEVICE allow running 2 instances on the same machine
- [ ] events repeated by id are ignored

## Notes

## Log

## Outcome
<!-- filled by `backlog done`: what shipped, how it was verified, learnings, follow-ups -->

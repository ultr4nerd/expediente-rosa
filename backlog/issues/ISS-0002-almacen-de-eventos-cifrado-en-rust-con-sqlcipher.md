---
id: ISS-0002
title: Encrypted event store in Rust with SQLCipher
kind: feature
status: done
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
- [x] append_events and list_events(cursor) work from the UI
- [x] the .db file is unreadable without the key (sqlite3 fails)
- [x] ER_DATA_DIR and ER_DEVICE allow running 2 instances on the same machine
- [x] events repeated by id are ignored

## Notes

## Log
- 2026-11-21 11:55 thread-a: started; plan in progress/ISS-0002.md
- 2026-11-21 11:57 thread-a: store.rs + commands; 5 cargo tests; sqlite3 on a real instance db fails
- 2026-11-21 11:57 thread-a: verify passed: pnpm verify
- 2026-11-21 11:57 thread-a: done: Shipped src-tauri/src/store.rs (SQLCipher, PRAGMA key from ER_DB_KEY, default jornada-demo) and Tauri commands append...

## Outcome
Shipped src-tauri/src/store.rs (SQLCipher, PRAGMA key from ER_DB_KEY, default jornada-demo) and Tauri commands append_events, list_events, device_info (ER_DATA_DIR, ER_DEVICE); template greet removed. Verified: 5 cargo tests (dedup by id, list after seq, invalid event rejected, sync bookkeeping, file unreadable without/with wrong key) and a real run where sqlite3 .tables on the db fails with 'file is not a database'. Follow-up: ISS-0006 uses pending_batch/mark_synced/meta helpers already in store.rs.

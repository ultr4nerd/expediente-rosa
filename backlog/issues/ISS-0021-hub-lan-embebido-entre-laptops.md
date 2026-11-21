---
id: ISS-0021
title: Embedded LAN hub between laptops
kind: feature
status: in-progress
priority: P2
area: rust
parent: ISS-0001
depends_on: [ISS-0006]
created: 2026-11-21
updated: 2026-11-21
due:
owner: thread-b
branch:
estimate: M
tags: []
---

## Context

## Scope

## Acceptance criteria
- [x] toggle 'esta laptop es el hub' (this laptop is the hub)
- [ ] the other instance syncs over local IP without internet

## Notes

## Log
- 2026-11-21 12:35 thread-b: started; plan in progress/ISS-0021.md
- 2026-11-21 12:35 thread-b: src-tauri/src/hub.rs: tiny_http server on 0.0.0.0:8788 (ER_HUB_PORT) serving /health, POST /events (peer events stored pending so the hub forwards them to the central), GET /events with cursor 0-<seq> (compatible with Valkey ids). Commands hub_start/hub_stop/hub_status; HubToggle on the sync screen. Rust e2e test: peer store syncs through the hub with the real sync_now over TCP. Not yet tried with two app instances

## Outcome
<!-- filled by `backlog done`: what shipped, how it was verified, learnings, follow-ups -->

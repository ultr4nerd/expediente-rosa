---
id: ISS-0021
title: Embedded LAN hub between laptops
kind: feature
status: done
priority: P2
area: rust
parent: ISS-0001
depends_on: [ISS-0006]
created: 2026-11-21
updated: 2026-11-21
due:
owner:
branch:
estimate: M
tags: []
---

## Context

## Scope

## Acceptance criteria
- [x] toggle 'esta laptop es el hub' (this laptop is the hub)
- [x] the other instance syncs over local IP without internet

## Notes

## Log
- 2026-11-21 12:35 thread-b: started; plan in progress/ISS-0021.md
- 2026-11-21 12:35 thread-b: src-tauri/src/hub.rs: tiny_http server on 0.0.0.0:8788 (ER_HUB_PORT) serving /health, POST /events (peer events stored pending so the hub forwards them to the central), GET /events with cursor 0-<seq> (compatible with Valkey ids). Commands hub_start/hub_stop/hub_status; HubToggle on the sync screen. Rust e2e test: peer store syncs through the hub with the real sync_now over TCP. Not yet tried with two app instances
- 2026-11-21 12:55 thread-b: thread-a final regression 12:47-12:53 on final main: central stopped; A toggled 'Esta laptop es el hub' (/health -> {hub:true}); B set URL http://127.0.0.1:8788 and synced 'En línea'; same patient on A (A-0001) and B (B-0001) crossed both ways, both showed Posibles duplicados offline; central started -> A forwarded B's events, 2026-0143/2026-0144 reached B through the hub, link on A reached B. Needed PR #29 (hub laptop re-projects while offline; URL per device). Closed by thread-a with --force: owner thread-b was closed by the integrator.
- 2026-11-21 12:55 thread-b: done --force: verify skipped (pnpm verify)
- 2026-11-21 12:55 thread-b: done: Embedded LAN hub (src-tauri/src/hub.rs, HubToggle) works live: with the central stopped, B synced against A's hub at ...

## Outcome
Embedded LAN hub (src-tauri/src/hub.rs, HubToggle) works live: with the central stopped, B synced against A's hub at http://127.0.0.1:8788, events crossed both ways and the duplicate proposal appeared on both; when the central came back A forwarded B's events and the final folios 2026-0143/2026-0144 reached B through the hub. Blockers fixed in PR #29 (re-project on every poll so the hub laptop shows peer events offline; central URL keyed per device because two instances on one Mac share localStorage). Untested: two physical laptops over real Wi-Fi; no auth on the hub (simulated).

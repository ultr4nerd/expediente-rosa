---
title: Domain in TypeScript, thin Rust
description: Matching, projection and rules live in TS as pure functions; Rust only does encrypted storage and transport
read_when: Deciding whether logic goes in Rust or TypeScript
id: decisions-0005
status: current
updated: 2026-11-21
tags: [arquitectura]
---
# Domain in TypeScript, thin Rust

## Decision

Projection, matching, autofill, validations and duplicate and conflict detection live in `src/domain/` as pure TypeScript functions with tests (Vitest). Rust only does two things: the encrypted event store (append and list from cursor) and the sync transport.

## Why

In a 4-hour sprint, a TS domain iterates with instant reload and is tested without compiling. It also enables plan B (PWA with Dexie) by swapping only the `EventStore` and `SyncTransport` adapters. Rust contributes where it really matters: on-disk encryption and networking without browser restrictions.

## Consequences

- The interface between the UI and Rust is minimal: `append_events`, `list_events(cursor)` and `sync(url)`.
- Moving matching to Rust remains a future improvement, if volume demands it.

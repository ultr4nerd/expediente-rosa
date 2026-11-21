---
title: Valkey as the central event store and folio counter
description: The central server is Hono + Valkey Streams with dedup, AOF and an atomic folio counter
read_when: Touching the central server, sync or remote persistence
id: decisions-0004
status: current
updated: 2026-11-21
tags: [valkey, sync]
---
# Valkey as the central event store and folio counter

## Decision

The central server (`server/`) is Hono + Valkey:

- an `events` stream as the global log;
- atomic deduplication by event id (`SET NX` + `XADD` script);
- `appendfsync always`;
- per-device cursor = stream ID;
- `INCR folio:<año>` for final folios.

## Why

An event log with a cursor maps directly onto Streams, and the atomic counter solves the folio without races. The volume (hundreds of events per *jornada*) makes `appendfsync always` cheap. Valkey sponsors the event, but its role here is real, not decorative.

## Consequences

- Valkey does not run on the laptops (no native Windows build and no Docker in the field).
- For production: managed Valkey (e.g., ElastiCache/MemoryDB for Valkey on AWS) with AOF and external archiving of the stream for 5 years.
- `XADD` alone does not deduplicate: do not remove the script.

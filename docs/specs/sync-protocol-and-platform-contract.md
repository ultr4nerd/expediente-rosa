---
title: Sync protocol and platform contract
description: Tauri commands, local SQLCipher schema and the central HTTP API (push, pull, folio assignment)
read_when: Implementing or calling the Rust store, the sync client or the central server; changing an event shape
id: sync-protocol-and-platform-contract
status: current
updated: 2026-11-21
tags: [sync, contract]
---


# Sync protocol and platform contract

## Goal

One contract that the Rust store, the TypeScript domain/UI and the central server implement in parallel without guessing. The source of truth for event shapes is `src/domain/events.ts`; the ports are in `src/domain/ports.ts`. Changing either is a cross-thread change: update this doc in the same PR.

## Scope

**In scope:**

- Tauri commands.
- Local storage schema.
- Central HTTP API.
- Folio assignment.
- The sync algorithm.

**Out of scope:**

- Peer-to-peer LAN hub (P2, ISS-0021): it reuses the same HTTP API, served by a laptop.
- Real authentication: roles are simulated (see the MVP spec).

## Requirements

### Event JSON

The JSON form of `EventEnvelope` in `src/domain/events.ts`. All keys are camelCase.

- `id` is a UUID v4 created on the device (`crypto.randomUUID()`) and is the dedup key in every layer.
- Rust treats `payload` as opaque JSON. It only reads `id`, `type` and `patientId`.
- `record.viewed` (ISS-0023) is an audit event: a clinical role pressed "Mostrar" on sensitive data. Payload `{ section: "sensitive_history" | "clinical_service" | "result", serviceId?: string }`, never the data itself. It syncs like any other event (Rust and the central do not inspect it). The projection keeps it out of the timeline and exposes it as `accessLog`, which the UI shows only to `admin`.

### Tauri commands (Rust → TS, `src/platform/tauri.ts`)

| Command | Args | Returns |
|---|---|---|
| `append_events` | `{ events: Event[] }` | `number`: newly inserted (duplicates by `id` ignored) |
| `list_events` | `{ afterSeq: number }` | `{ events: Event[], lastSeq: number }` in local insertion order |
| `sync_now` | `{ centralUrl: string }` | `SyncStatus` (see `ports.ts`) |
| `sync_status` | none | `SyncStatus` |
| `device_info` | none | `{ device: string, dataDir: string }` |
| `save_export` | `{ name: string, contents: string }` | `string` full path written (Downloads, else `<dataDir>/exports`); name is sanitized |

**Environment variables:**

- `ER_DATA_DIR`: directory for `expediente.db`. Defaults to the Tauri app data dir.
- `ER_DEVICE`: device letter for provisional folios. Defaults to `A`.
- `ER_DB_KEY`: SQLCipher passphrase. The demo default is `jornada-demo`, declared as simulated; production uses a per-*jornada* passphrase typed at login.

### Local schema (SQLCipher, `PRAGMA key` before anything else)

```sql
CREATE TABLE IF NOT EXISTS events (
  seq     INTEGER PRIMARY KEY AUTOINCREMENT,
  id      TEXT NOT NULL UNIQUE,
  type    TEXT NOT NULL,
  patient TEXT NOT NULL,
  json    TEXT NOT NULL,
  synced  INTEGER NOT NULL DEFAULT 0   -- 1 once acknowledged by the central
);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
-- meta: 'remote_cursor' = last Valkey stream id pulled
```

Events pulled from the central are inserted with `synced = 1`. Events whose `device` is `S` (the fictitious seed, `src/domain/seed.ts`) are also stored with `synced = 1`: the seed is identical on every laptop, is never pushed, and its `folio.assigned` events would be rejected by the central. `pending` = `COUNT(*) WHERE synced = 0`.

### Central HTTP API (`server/`, Hono + Valkey)

| Method and path | Body / query | Response |
|---|---|---|
| `GET /health` | none | `{ ok: true }` |
| `POST /events` | `{ device: string, events: Event[] }` | `{ accepted: string[], duplicates: string[] }` (event ids) |
| `GET /events` | `?after=<streamId or 0>` | `{ events: Event[], cursor: string }` |

**Valkey layout:**

- Stream `er:events`: field `json`.
- Key `er:seen:<eventId>`: dedup marker.
- Counter `er:folio:<year>`.
- Hash `er:folio:by-patient`: patientId → folio, so a retry never assigns twice.
- **Dedup and append** happen in one Lua script: `SET er:seen:<id> 1 NX`; if it was set, `XADD er:events * json <event>`.
- **Folio assignment:** for every newly accepted `patient.created`, the server checks `er:folio:by-patient`. If the patient has no folio yet, it runs `INCR er:folio:<year>`, formats it as `<year>-<NNNN>` (4 digits, zero-padded), stores it in the hash and appends a server-authored `folio.assigned` event: `device: "central"`, `role: "admin"`, `author: "central"`, same `jornadaId`. That event reaches every device on the next pull.
- **Persistence:** `appendonly yes`, `appendfsync always`.

### Sync algorithm (Rust `sync_now`)

1. `GET /health` with a 2 s timeout. If it fails, return `connectivity: "offline"` and keep everything pending.
2. Push: send `events WHERE synced = 0` in insertion order, in batches of 200, to `POST /events`. Mark `accepted ∪ duplicates` as `synced = 1`.
3. Pull: `GET /events?after=<remote_cursor>`. Insert with `INSERT OR IGNORE` (`synced = 1`) and store the new cursor.
4. Return `SyncStatus` with `pending`, `lastSyncAt` and `connectivity: "online"`.

The UI calls `sync_now` every 10 s while the app is open, and on demand from the sync indicator.

### Provisional folios

The client computes them, not Rust:

- **Format:** `<device>-<NNNN>`, where `NNNN` = 1 + the number of `patient.created` events from this device in the local log.
- They are only unique per device. The final folio arrives through `folio.assigned`, and the UI shows the final one when present, else the provisional one, styled differently (see `design/DESIGN.md`).

## Acceptance criteria

- Pushing the same batch twice yields only `duplicates` the second time, with no duplicate stream entries. The central has a test for this.
- Two devices, each offline-creating one patient, end up with `2026-0001` and `2026-0002` after both sync, regardless of order.
- An event created on device A appears in device B's `list_events` after both call `sync_now`.
- `sqlite3 expediente.db .tables` fails without the key (the file is encrypted).

## Open questions

Owner: team, to be decided during the build.

- Year rollover at midnight on Dec 31: use the `at` of the `patient.created` event, not the server clock.

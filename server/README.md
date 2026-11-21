# Hilo central (Hono + Valkey)

Central sync point for the desktop app. Contract: `docs/specs/sync-protocol-and-platform-contract.md`; why Valkey: `docs/decisions/0004-*.md`.

## Run

```sh
docker compose -f server/compose.yaml up --build   # Valkey on :6379, server on :8787
docker compose -f server/compose.yaml down -v      # stop and wipe the demo data
```

Without Docker for the server (Valkey still needed): `cd server && npm ci && npm start` (Node >= 22.18 runs the TypeScript directly). Env: `VALKEY_URL` (default `redis://localhost:6379`), `PORT` (default `8787`).

## Tests

Integration tests against a real Valkey (DB 15, flushed per test):

```sh
docker compose -f server/compose.yaml up -d valkey
cd server && npm ci && npm test
```

## API

| Endpoint | Does |
|---|---|
| `GET /health` | `{ ok: true }` |
| `POST /events` `{ device, events }` | `{ accepted, duplicates }` (event ids) |
| `GET /events?after=<streamId or 0>` | `{ events, cursor }`, up to 1000 events per call; pull again with the cursor |
| `GET /stats?year=2026` | `{ streamLength, folioCounter, patientsWithFolio, lastStreamId }` for the demo |

## How Valkey is used

| Key | Type | Role |
|---|---|---|
| `er:events` | Stream (field `json`) | The global, append-only event log. A device's cursor is a stream ID; pull is `XRANGE er:events (<cursor> + COUNT 1000`. |
| `er:seen:<eventId>` | String | Dedup marker. `XADD` never deduplicates, so `SET NX` is the gate. |
| `er:folio:<year>` | String counter | `INCR` gives the next consecutive folio for that year. |
| `er:folio:by-patient` | Hash | patientId → folio, so a patient never gets two folios. |

Every pushed event goes through one Lua script (`src/push.lua`), run atomically by Valkey:

1. `SET er:seen:<id> 1 NX`. If the key existed, the event is a duplicate: stop.
2. `XADD er:events * json <event>`.
3. If it is a `patient.created` and the patient has no entry in `er:folio:by-patient`: `INCR er:folio:<year>`, format `<year>-<NNNN>`, `HSET` it, and `XADD` a server-authored `folio.assigned` event (`device`/`author`: `central`, `role`: `admin`).

Because the dedup check, the append and the counter run in the same script, a retried push, two devices syncing at once or a crash between requests can never duplicate an entry or skip or repeat a folio. The year comes from the `patient.created` event's `at`, not the server clock. Valkey runs with `appendonly yes` and `appendfsync always`, so an acknowledged event is on disk.

Clients cannot push `folio.assigned` (400); re-sending one they pulled counts as a duplicate.

Not done (demo scope): auth, TLS, cluster mode (the keys do not share a hash slot, so the script needs a single Valkey node), stream trimming or archiving.

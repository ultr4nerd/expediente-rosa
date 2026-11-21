---
title: MVP Hilo
description: "Closed scope of the hackathon MVP: architecture, event model, P0/P1/out, demo and schedule"
read_when: Before building or cutting any feature, or when preparing the demo
id: mvp-expediente-rosa
status: current
updated: 2026-11-21
tags: [mvp, alcance]
---

# MVP Hilo

## Goal

A single digital patient record for EIRA Movimiento Rosa A.C. (Challenge 1, Vibeathon Nerdearla MX 2026). It is a desktop app for the 2 Windows laptops of each *jornada* (field medical day). It recognizes a returning patient without merging records automatically, reuses her identity and history to avoid re-capture, works all day without internet with data encrypted on disk, and at night syncs with a central server that assigns the final *folio EIRA* (EIRA's yearly consecutive patient ID) without collisions. Domain context: [eira-context-and-real-forms.md](eira-context-and-real-forms.md).

## Scope

**In (P0, cut line):**

1. Registration with the identity block (once for both Pap smear and breast exam), privacy notice accepted and provisional folio.
2. Error-tolerant search, with the reason for each match and human confirmation ("misma persona" / "otra persona").
3. Visit with Pap smear (*citología*) and breast exam (*revisión mamaria*) services (reduced *reactivos*, i.e. form items), reusing the identity.
4. Autofill from history: cytology *reactivo* 11 computed, 22.1 previous cytology number, last mammogram and stable history in "confirm" mode.
5. Validations against fatigue errors: computed age, impossible dates, height, weight and blood pressure ranges.
6. Contact data change preserving history.
7. Encrypted SQLite on disk; full capture without network.
8. Sync of two instances against the central server (Hono + Valkey), with final folio.
9. Duplicate created offline: link proposal, human confirmation, one folio survives and the other becomes an alias.
10. Simulated roles in the UI (*capturista* i.e. data-entry staff, doctor, pathologist): the *capturista* does not see sensitive history and the pathologist records the result (Bethesda/BIRADS) later.

**P1, in order:** CSV export without personal data · JSON backup of the event log · printable contingency sheet · avoided re-capture counter · per-field conflict (`prev`) · LAN hub between laptops.

**Out (goes into the README as the path to production):** QR on the *Cartilla EIRA* (patient card), AWS deployment, real roles with server-side filtering, 5-year purge, delivering results to patients (Challenge 4), nutrition and psychology forms, mDNS, installer notarization and signing.

## Requirements

**Architecture** (decisions 0001-0005 in `docs/decisions/`):

- **Client:** Tauri 2. React + TypeScript for UI and domain (pure functions with tests).
- **Rust:** event store in encrypted SQLite (`rusqlite` with `bundled-sqlcipher-vendored-openssl`) and sync client (`reqwest`). Data directory and device name via environment variables (`ER_DATA_DIR`, `ER_DEVICE`) to run two instances on one machine.
- **Central:** `server/`, Hono + Valkey. `events` stream; atomic deduplication (`SET NX` + `XADD`, in a script); `appendfsync always`; per-device cursor = stream ID; `INCR folio:<año>` for the final folio.
- **Interface between UI and store:** `EventStore` (append, list from cursor) and `SyncTransport` (push, pull). There is a Tauri adapter and an in-memory adapter for tests and for plan B (PWA with Dexie).

**Event model.** Every event carries `id` (UUID), `type`, `patientId`, `at` (local ISO time), `device`, `author`, `role`, `jornadaId` and `payload`. Types:

| Event | Payload |
|---|---|
| `patient.created` | identity: name, date and state of birth, residence, phones, email, health coverage + number, card yes/no; provisional folio |
| `privacy.accepted` | notice version, date |
| `field.updated` | field, new value, `prev` (id of the event it replaces) |
| `history.confirmed` | stable history confirmed unchanged |
| `visit.recorded` | *jornada*, site, date, height, weight, BP, glucose, LMP (FUM), reason |
| `service.recorded` | `visitId`, type `citologia` / `mama`, *reactivos*, license (*cédula*) of whoever takes the sample, cytology number |
| `result.recorded` | `serviceId`, Bethesda or BIRADS + next steps (author: pathologist or doctor) |
| `folio.assigned` | final folio `AAAA-NNNN` issued by the central server |
| `patients.linked` | surviving record, alias record, reason |
| `patients.marked_distinct` | pair of records confirmed as different people |
| `record.viewed` | audit: a clinical role revealed sensitive data (`section`, optional `serviceId`); shown to admin only |

**Rules:**

1. State is projected from events; nothing is deleted or overwritten.
2. Never merge without human confirmation; linking is recorded as an event and is reversible by design.
3. The name is never an identifier. Matching: normalized name (accents, "Ma." → María, surname order) with Jaro-Winkler, plus date of birth, last 4 digits of the phone and municipality. A computed CURP-like key (no homoclave) only to group candidates.
4. The provisional folio (`A-0007`, laptop letter + local counter) is visually distinct from the final one (`2026-0143`) and remains a searchable alias.
5. Notifications and exports never carry diagnoses or unnecessary personal data.

## Acceptance criteria

Demo script (2 min); each step works live with fictitious data:

- **Problem (0:00-0:15).** "After 100 records I no longer know if I'm capturing correctly"; a Pap smear and an ultrasound on the same day are two sheets with the same data.
- **Avoided re-capture (0:15-0:55).** With Wi-Fi off, María returns in May. Searching "Maria Ejenplo" shows María Ejemplo and María Ejemplar with the reason. On confirming, the form opens with identity filled in, "subsecuente" (follow-up) computed and the previous cytology number; only today's data is captured.
- **Offline duplicate (0:55-1:25).** On the other laptop, offline, someone registers the same patient. Wi-Fi returns: the provisional folios become `2026-0143` and `2026-0144` without collision, the Valkey stream grows and the system proposes linking without merging.
- **Roles (1:25-1:40).** The pathologist captures the Bethesda result; the *capturista* does not see the sensitive history.
- **Close (1:40-2:00).** The database file is unreadable (`sqlite3` or hex viewer), followed by the "real / simulated / untested" slide.

Also: `pnpm verify` green; README with architecture, implemented vs simulated, risks, costs, operations, next steps and open questions; MIT license; public repo.

**Schedule (CST, Nov 21):**

| Time | Block | Gate and plan B |
|---|---|---|
| 11:50 | Encrypted event written and read via Tauri | If it fails: encrypt each event's content; if Tauri fails: PWA with Dexie |
| 12:30 | Event from A visible on B via the central server | If it fails: 15 more min; then sync via exported and imported file |
| 13:30 | Registration, search, visit, autofill, validations (tag `demo-ok`) | |
| 14:30 | Final folio, offline duplicate, roles, result | If the folio is not ready: demo only the duplicate |
| 14:50 | P1 in order and feature freeze | |
| 15:25 | README, slide, backup video | |
| 15:40 | Submit to Devpost | |

## Open questions

Owner: team, with EIRA's mentors.

- Is the folio written on the sheet or the card during the *jornada*, or assigned later at the office? Are gaps tolerated? Decides between provisional and per-laptop blocks.
- Does the same patient go through both laptops the same day? If so, the LAN hub moves up to P0.
- Does the pathologist capture on an EIRA laptop or from their lab? What is printed on the *Cartilla EIRA*?

**Stated assumptions:**

- Roles are a UI filter, with one database key per laptop.
- Valkey does not run on the laptops; it needs AOF and external archiving for 5 years.
- Windows is built in CI, not executed.
- Record purge and retirement are designed, not implemented.
- All data is fictitious.

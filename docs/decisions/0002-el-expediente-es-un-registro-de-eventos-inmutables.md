---
title: The patient record is an immutable event log
description: "Event sourcing: state is projected from events; history, audit log and sync come from it"
read_when: Modeling data, adding a kind of change or touching the state projection
id: decisions-0002
status: current
updated: 2026-11-21
tags: [datos, sync]
---
# The patient record is an immutable event log

## Decision

Every registration, data change, visit, service, result, folio or link is an immutable event with author, role, device, time and *jornada* (field medical day). The record's state is a pure projection of those events.

## Why

EIRA's guide asks to keep the change history without deleting, an audit log, offline capture and sync with conflict detection. With events, all three come from the same mechanism: syncing means exchanging the events the other side lacks, deduplicated by id. The alternative (mutable tables with `updated_at` plus a separate audit table) duplicates the logic and loses what existed before the conflict.

## Consequences

- Events are never edited or deleted. A correction is another event with `prev`.
- Retiring a record (5-year retention) needs a retirement event plus purging personal data: designed, not implemented in the MVP.
- The projection must be deterministic: sort by (`at`, `id`) and be idempotent against repeated events.

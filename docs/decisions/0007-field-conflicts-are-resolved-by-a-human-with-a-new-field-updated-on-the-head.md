---
title: Field conflicts are resolved by a human with a new field.updated on the head
description: Open conflict = flagged head; Conservar este valor appends field.updated with prev = head; losers stay in history
read_when: Touching field.updated, conflict detection or the Conflictos panel
id: decisions-0007
status: current
updated: 2026-11-21
tags: [sync, conflicts]
---

# Field conflicts are resolved by a human with a new field.updated on the head

## Decision

A field has an open conflict when its latest change (the head, in projection order (at, id)) is flagged `conflict`, i.e. two `field.updated` started from the same `prev`. The contenders are the head, the change it should have replaced, and every other change with the head's `prev`. "Conservar este valor" appends a new `field.updated` with the chosen value and `prev` = the head's id, and an `at` strictly after the head. Implemented in `src/domain/conflicts.ts`.

## Why

- Decision 0002: nothing is updated or deleted. The resolution is one more event, and the losing values stay in the history.
- Pointing `prev` at the head makes the resolution the expected successor, so the existing projection rule closes the conflict without new event types or contract changes.
- Rejected: last-writer-wins without a human (silently drops a phone number captured in the field); a new `conflict.resolved` event (contract change late in the hackathon).

## Consequences

- Until someone resolves it, the projection shows the latest value. The UI marks it as "Se muestra ahora por ser el más reciente", and the patient header shows a red badge.
- The conflict comes back if, later, another offline edit starts from an old `prev`. That is correct: it is a new conflict.
- Sensitive history fields follow the same role rule as the history panel: only roles allowed by `canSeeSensitive` see or resolve them.

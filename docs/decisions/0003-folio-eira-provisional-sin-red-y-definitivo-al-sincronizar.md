---
title: Provisional folio EIRA offline, final on sync
description: How the yearly folio EIRA consecutive is assigned with two offline laptops without collisions
read_when: Touching patient registration, folios, folio search or the central server
id: decisions-0003
status: current
updated: 2026-11-21
tags: [folio, sync]
---
# Provisional folio EIRA offline, final on sync

## Decision

- **Internal identifier:** a UUID generated on the laptop, never shown.
- **Offline:** the laptop issues a visibly different provisional folio (`A-0007`: laptop letter + local counter).
- **On sync:** the central server assigns the yearly consecutive `AAAA-NNNN` (year-number) with `INCR folio:<año>` in Valkey and records it as a `folio.assigned` event.
- **Alias:** the provisional folio remains a searchable alias forever.

## Why

The mentors confirmed that the EIRA ID is the same as the *folio EIRA* (EIRA's yearly consecutive patient ID): consecutive, yearly, unique and assigned by EIRA. With 2 offline laptops, a local consecutive collides.

- Blocks reserved per laptop leave gaps and break the "consecutive like official letters" rule.
- A permanent per-laptop prefix changes the institutional format.

## Consequences

- During the *jornada* the paper sheet carries the provisional folio; the final one appears after the nightly sync. To be validated with EIRA: if the folio must be written on paper or on the *Cartilla EIRA* (patient card) the same day, reserved blocks should be reconsidered.
- Folio search accepts both the provisional and the final folio.

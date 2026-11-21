---
title: Badge
description: Status badge (shadcn + custom variants)
read_when: When showing sync status, autofill or short labels
status: draft
updated: 2026-11-21
---

# Badge

## Purpose

Short, non-interactive status. Always icon + text: never color alone.

## Variants

| variant | use | tokens |
|---|---|---|
| success | Sincronizado (synced) | `color.success-subtle` / `color.on-success-subtle` |
| warning | Pending sync | `color.warning-subtle` / `color.on-warning-subtle` |
| danger | Conflict, likely duplicate | `color.danger-subtle` / `color.on-danger-subtle` |
| offline | No network | `color.offline` / `color.on-offline` |
| autofill | "Del historial" on autofilled fields | `color.autofill` / `color.on-autofill` |
| secondary | Neutral brand labels (role, *jornada*) | `color.secondary` / `color.on-secondary` |

Type `type.caption` in semibold, radius `radius.pill`.

## Code

`src/components/ui/badge.tsx` (success, warning, danger, offline, autofill variants added).

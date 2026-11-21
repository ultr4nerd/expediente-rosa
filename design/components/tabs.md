---
title: Tabs
description: Tabs (shadcn)
read_when: When splitting a patient's record into sections
status: draft
updated: 2026-11-21
---

# Tabs

## Purpose

Record sections: Identidad, Antecedentes, Visitas, Resultados. Maximum 5 tabs.

## Tokens

Height `spacing.control`, text `type.label`, active on `color.surface-raised`, inactive `color.on-surface-muted`.

## Accessibility

Left/right arrows switch tabs (Radix). Each tab has text, not just an icon.

## Code

`src/components/ui/tabs.tsx` (local changes: 44px height, `type-label`).

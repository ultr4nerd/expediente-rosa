---
title: Button
description: Action button (shadcn), 44px minimum height
read_when: Before placing a clickable action on a screen
status: draft
updated: 2026-11-21
---

# Button

## Purpose

Performs an action. To navigate to another screen use a link (`variant="link"`).

## Variants

| variant | use |
|---|---|
| default | The primary action, one per screen: `color.primary` / `color.on-primary`, hover `color.primary-hover` |
| outline | Secondary actions (Cancelar, Buscar otra vez) |
| secondary | Supporting actions inside cards: `color.secondary` / `color.on-secondary` |
| ghost | Toolbar actions |
| destructive | Delete or discard, always after confirming in a Dialog: `color.danger` |
| link | Inline navigation: `color.brand-text` |

Sizes: `default` = `spacing.control` (44px), `lg` = `spacing.control-lg` (52px) for Guardar/Registrar,
`icon` = 44x44. `sm` and `xs` only in dense tables.

## States

- focus-visible: 2px `color.focus` ring with 2px offset.
- disabled: 50 % opacity; explain in text why it is disabled.

## Content

Verb + object in Spanish: "Guardar paciente", "Asignar folio". Never a bare "Aceptar" or "Enviar".
Type `type.label`.

## Code

`src/components/ui/button.tsx` (local changes: heights, `type-label`, hover `primary-hover`, solid focus ring).

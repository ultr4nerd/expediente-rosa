---
title: Input
description: Single-line text field (shadcn)
read_when: Before building a capture form
status: draft
updated: 2026-11-21
---

# Input

## Purpose

Short text capture. Always with a visible `Label` above; the placeholder is an example, not the label.

## Tokens

- Background `color.surface-raised`, border `color.input` (3:1), text `type.body`, height `spacing.control`, radius `radius.control`.
- Error: `aria-invalid` sets a `color.danger` border; the message goes below in `type.caption` with `color.danger`.
- Autofill from history: wrap the field in the "Field autofilled from history" pattern from DESIGN.md.

## Accessibility

- Native `<input>` with an `id` bound to the `Label`. Tab advances in the visual order of the paper form.
- Use `inputMode="numeric"` for weight, height, glucose and phone numbers.

## Code

`src/components/ui/input.tsx` (local changes: 44px height, card background, always 16px text).

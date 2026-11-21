---
title: Dialog
description: Modal window (shadcn)
read_when: When asking for confirmation, resolving a duplicate or showing a detail without leaving the screen
status: draft
updated: 2026-11-21
---

# Dialog

## Purpose

Destructive confirmations, duplicate resolution ("¿Es la misma paciente?"), revealing sensitive data.
Not for long forms: those go full screen.

## Tokens

Background `color.surface-raised`, radius `radius.card`, shadow `shadow.overlay`, title `type.title`,
entrance in `motion.duration.base` with `ease.standard`.

## Accessibility

Focus trapped inside; Escape closes; focus returns to the button that opened it. The primary button goes on the right.

## Code

`src/components/ui/dialog.tsx` (local change: description at 16px).

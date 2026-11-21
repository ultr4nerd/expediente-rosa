---
title: Card
description: Container for a group of information (shadcn)
read_when: When grouping data for a patient, a visit or a match
status: draft
updated: 2026-11-21
---

# Card

## Purpose

Groups related information: identity data, a visit, a match card.

## Tokens

Background `color.surface-raised` on `color.surface`, border `color.border`, radius `radius.card`,
shadow `shadow.raised`, padding `spacing.lg`. Title `type.heading` (or `type.title` if it is the main one).

## Variant: match card

See "Match card" in DESIGN.md: name in `type.body-strong`, folio, and the "por qué coincide" (why it
matches) list with each criterion marked with icon + text.

## Code

`src/components/ui/card.tsx` (local change: description at 16px).

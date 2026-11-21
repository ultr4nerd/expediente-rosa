---
title: Wordmark
description: Expediente Rosa logotype (mark + name)
read_when: When placing the brand in the top bar, the home screen or product materials
status: draft
updated: 2026-11-21
---

# Wordmark

## Purpose

Identifies the product. The mark is a folder with a prevention ribbon, in `color.primary` and
`color.surface`. It is not the EIRA logo and does not imitate it.

## Variants

- `<Wordmark />`: top bar.
- `<Wordmark withEndorsement />`: home, with "con EIRA Movimiento Rosa" in `type.caption`.
- `<BrandMark />`: mark only (icon). Files: `src/assets/brand/wordmark.svg`, `app-icon.svg`, `app-icon-1024.png`.

## Do and don't

- Do: leave clear space around it equal to the mark's height.
- Don't: recolor, stretch, place over photographs, or replace with the EIRA logo.

## Code

`src/components/ui/wordmark.tsx`

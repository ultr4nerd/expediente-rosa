---
title: Tailwind max-w sizes collide with spacing tokens; native date inputs are unreliable
description: max-w-sm/md/lg/xl/2xl resolve to our spacing tokens (8-48px); type=date mis-parses fast typing
read_when: Setting widths with Tailwind or capturing dates in a form
id: learnings-0001
status: current
updated: 2026-11-21
tags: [ui, tailwind, forms]
---

# Tailwind max-w sizes collide with spacing tokens; native date inputs are unreliable

## What happened

Building the patient registration form (ISS-0008), `max-w-2xl` rendered the form 48px wide: Tailwind v4
resolves `max-w-<name>` from `--spacing-<name>` before `--container-<name>`, and our tokens define
`--spacing-xs` … `--spacing-2xl` (4–48px). Checked in the built CSS: `.max-w-md{max-width:var(--spacing-md)}` (16px),
which also caps the login card in `src/screens/LoginScreen.tsx`. Separately, `<input type="date">` turned the typed
"15031985" into 3 Dec 1985: its segment order follows the WebView locale and half-typed segments survive Tab.

## Lesson

- For widths use names our spacing tokens do not define (`max-w-prose`, `max-w-3xl` and up), never `max-w-xs|sm|md|lg|xl|2xl`.
- Capture dates with a masked text field in DD/MM/AAAA (`maskBirthDate` / `birthDateFromMask` in `src/domain/identity.ts`), not the native date input.

## Apply when

Any `max-w-*`, `w-*` or `size-*` utility whose suffix matches a spacing token (`xs`, `sm`, `md`, `lg`, `xl`, `2xl`), and any date field in a capture form.

## Enforcement

None yet: `pnpm design check` does not flag `max-w-{xs,sm,md,lg,xl,2xl}`; a candidate rule for the design CLI. The date mask is covered by tests in `src/domain/identity.test.ts`.

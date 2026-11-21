---
title: Expediente Rosa design system
description: "Entry point: principles, voice, foundations, key patterns (sync, folio, matches, autofill) and component inventory"
read_when: Before building or changing any Expediente Rosa screen, component or asset
status: current
updated: 2026-11-21
---

# Expediente Rosa design system

Read this, then `design/TOKENS.md` (or `pnpm design show color`) and only the spec you are about to use.
Use tokens or shadcn classes (`bg-primary`, `text-muted-foreground`), never raw hex or px. `pnpm design check` must pass.

## Overview

Digital patient record for the *jornadas* (field medical days) of EIRA Movimiento Rosa A.C. (breast and
cervical cancer prevention). Used by doctors and *capturistas* (data-entry staff) on modest Windows laptops, with no internet, up to
150 patients a day. Feel: **warm, clear, trustworthy**. Brand: [EIRA sitio web](references/eira-sitio-web.md).

## Principles

1. **Capture speed over decoration.** Keyboard first, fields in the order of the paper form, one primary action per screen.
2. **State is never guessed.** Sync, folio and the origin of each piece of data are always visible, with text and icon.
3. **Warm, not childish.** Pink for accents and actions; warm neutrals for surfaces; no bubblegum pink on large areas.
4. **Readable on any laptop.** Text ≥16px, AA minimum, 44px targets, visible focus.
5. **Privacy by default.** Sensitive data is hidden by role and revealed with an explicit action.

## Voice and microcopy

- The UI speaks to staff: plain Spanish, informal *tú*, direct and kind. No jargon ("sincronizar" yes, "evento" no).
- Buttons = verb + object: "Guardar paciente", "Buscar en historial". Same action, same word.
- Errors: what happened and how to continue. "Falta la fecha de nacimiento." Never blame or show codes.
- Empty states: what will appear here and the first action ("Aún no hay pacientes hoy. Registra la primera.").
- Sentence case only. Dates `21 nov 2026`; folios with tabular figures.

## Color

- Roles, not primitives. `color.primary` (#b7426c, EIRA pink) only for the primary action, selection and accents.
- Surfaces: `color.surface` (cream background), `color.surface-raised` (cards, fields), `color.surface-sunken`.
- Text: `color.on-surface` and `color.on-surface-muted`; pink as text only with `color.brand-text`.
- Sync states (always icon + word):

| state | badge | tokens |
|---|---|---|
| Sincronizado (synced) | `success` | `color.success-subtle`, `color.on-success-subtle` |
| Pendiente (pending) | `warning` | `color.warning-subtle`, `color.on-warning-subtle`, dot `color.warning` |
| Conflicto (conflict) | `danger` | `color.danger-subtle`, `color.on-danger-subtle` |
| Sin conexión (offline) | `offline` | `color.offline`, `color.on-offline` |

## Typography

- `type-*` classes: `type-title`, `type-heading`, `type-body`, `type-body-strong`, `type-label`, `type-caption` (14px, minimum), `type-folio`.
- Body: Atkinson Hyperlegible Next (OFL), made for low vision: distinguishes 1/l/I and 0/O. Headings: Montserrat (OFL, the one on EIRA's website).
- Both bundled with `@fontsource-variable` (no CDN: there is no internet in the field). Fallback: Segoe UI, system-ui.

## Layout and spacing

- Spacing only from `spacing.*` (`p-md`, `gap-lg`). Controls with height `spacing.control` (44px); primary action `spacing.control-lg`.
- Screens from 1280x720 to 1920x1080. Forms in a single column, max 640px; lists full width.
- Medium density: more air between groups (`spacing.lg`) than between fields (`spacing.md`).

## Shape, elevation and motion

- Radii: `radius.control` on controls, `radius.card` on cards and dialogs, `radius.pill` on badges.
- Cards with `color.border` border + `shadow.raised`; dialogs and toasts with `shadow.overlay`.
- Motion only to confirm: `motion.duration.fast` / `motion.duration.base`, `ease.standard`. Turned off with `prefers-reduced-motion`.

## Imagery and icons

- Icons: lucide-react, stroke 2, 20px next to text. Always with a visible label or `aria-label`.
- Illustration: warm flat editorial, diverse Mexican women, no text (`src/assets/illustrations/`). Only on home and empty states, never during capture.
- Own brand: folder + ribbon ([wordmark](components/wordmark.md)). Do not use or imitate the EIRA logo.

## Key patterns

- **Sync indicator**: always visible in the top bar, on the right: status badge + count ("12 pendientes") + time of last sync. Click opens the detail.
- **Offline banner**: `bg-offline text-on-offline` strip at the very top, `role="status"`, CloudOff icon: "Sin conexión. Todo se guarda en esta laptop y se sincroniza al volver la red." Informs, does not alarm; never blocks capture.
- **Provisional vs final folio** (*folio EIRA*, EIRA's yearly consecutive patient ID): provisional (`A-0007`) in `type-folio` with dashed `color.warning-border` border on `color.warning-subtle` and the word "provisional"; final (`2026-0143`) with solid `color.border` border on `color.surface-raised`. The provisional one stays visible as a small alias.
- **Match card**: Card with name (`type-body-strong`), folio, age and community, and the list "Por qué coincide" (why it matches): each criterion with a check icon and text ("Mismo nombre y fecha de nacimiento", "Teléfono igual"). Actions: "Es la misma paciente" (default) and "Es otra persona" (outline). Never merge without confirmation.
- **Field autofilled from history**: `bg-autofill` container with a 4px left border `color.autofill-border`, `autofill` badge "Del historial" with the source date, and a "Confirmar" button (or Enter). On edit or confirm, it returns to the normal style.
- **Sensitive data by role**: if the role cannot see it, it shows as `••••` on `color.surface-sunken` with a lock icon and "Oculto para tu rol"; whoever can, presses "Mostrar" (it gets logged). Never leave the field empty: empty looks like "no data".

## Accessibility floor

- WCAG 2.2 AA: text 4.5:1, UI and focus 3:1 (checked by `design check`).
- Focus: 2px `color.focus` (plum) outline offset 2px; never `outline: none` without a replacement.
- Targets ≥44x44px. Never color alone: state = icon + text. Tab order = visual order.

## Surfaces

| surface | what matters there | spec |
|---|---|---|
| Desktop app (Tauri, WebView2) | Tokens via `design/tokens.css` + Tailwind v4 + shadcn/ui | [shadcn/ui](targets/shadcn.md) |
| App icon | `src/assets/brand/app-icon-1024.png` → `pnpm tauri icon` | [wordmark](components/wordmark.md) |
| Printed contingency sheet | Black on white, one sheet per page, `print:` variants | [print](targets/print.md) |

## Components

<!-- design:components:start -->
| component | read when |
|---|---|
| [Badge](components/badge.md) (draft) | When showing sync status, autofill or short labels |
| [Button](components/button.md) (draft) | Before placing a clickable action on a screen |
| [Card](components/card.md) (draft) | When grouping data for a patient, a visit or a match |
| [Dialog](components/dialog.md) (draft) | When asking for confirmation, resolving a duplicate or showing a detail without leaving the screen |
| [Input](components/input.md) (draft) | Before building a capture form |
| [Label](components/label.md) (draft) | When labeling any form field |
| [Select](components/select.md) (draft) | When picking one option from a closed list (affiliation, site, Bethesda, BIRADS) |
| [Separator](components/separator.md) (draft) | When separating groups inside a card or bar |
| [Sonner](components/sonner.md) (draft) | When confirming something was saved or flagging a non-blocking error |
| [Tabs](components/tabs.md) (draft) | When splitting a patient's record into sections |
| [Wordmark](components/wordmark.md) (draft) | When placing the brand in the top bar, the home screen or product materials |
<!-- design:components:end -->

## Do and don't

- Do: one `default` action per screen; the rest `outline` or `ghost`.
- Do: confirm saves with a toast; field errors inline, next to the field.
- Don't: palette classes (`bg-pink-500`), arbitrary values (`p-[13px]`) or hex in `src/`.
- Don't: pink on large backgrounds, or light pink text.

## Open decisions

- [ ] Pink and plum are measured from eiraac.org CSS (provisional) until EIRA confirms official colors.
- [ ] Dark mode: not included (daytime field use, time budget).
- [ ] Empty-state illustration: pending (no generation credits).

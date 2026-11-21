---
title: EIRA sitio web
description: Colors, typefaces and logo measured from the public site of EIRA Movimiento Rosa A.C. (live CSS, 2026-11-21)
read_when: Before changing the brand palette, the fonts, or the use of EIRA's name and logo
source: https://eiraac.org/
received: 2026-11-21
status: current
---

# EIRA sitio web

## Source

Official live site (`<title>EIRA | SITIO OFICIAL`), the `css/main.css` stylesheet and the Google Fonts linked
from `index.html`. There is no brand manual: everything below is **measured from the CSS** (medium confidence
at most) or **inferred** (low). Authority: reference for the parent brand, not approved direction for
this product. Original: https://eiraac.org/ and https://eiraac.org/css/main.css

## Extracted

| item | value | where in the source | confidence | token |
|---|---|---|---|---|
| Action pink-magenta | `#b7426c` | `main.css`, button backgrounds and borders (lines ~4360, 5846, 6117) | medium | `primitive.color.rosa.600` |
| Heading pink-brown | `#7d3b3b` | `main.css`, most repeated color (64 uses), text and headings | medium | `primitive.color.rosa.800` (approx.) |
| Light pink | `#ffd7de`, `#ffebee`, `#ffa9b8` | `main.css`, section backgrounds and accents | medium | `primitive.color.rosa.50/100` (approx.) |
| Plum | `#6a2b51` | `main.css`, 8 uses | medium | `primitive.color.ciruela.700` |
| Sage green | `#6f9c76` | `index.html`, inline style | low | inspires `primitive.color.verde.*` |
| Cream background | `rgb(255, 248, 245)` | `main.css`, 5 uses | medium | inspires `primitive.color.neutral.50` |
| Primary typeface | Montserrat | `main.css` (34 declarations), Google Fonts | medium | `font.display` |
| Secondary typefaces | M PLUS Rounded 1c, Rosarivo | `main.css`, Google Fonts | medium | not used |
| Logo | Gray, the word "EIRA" with a triangular shape; "Movimiento Rosa" mark | team briefing + site | low | not used as an icon |

## Rules and intent

- There are no written usage rules. The site uses pink on light backgrounds, a warm tone, and photography of
  community *jornadas*.
- Expediente Rosa is its own product that **mentions** EIRA; it does not imitate its logo.

## Not specified

States (success, warning, error), dark mode, AA-contrast text variants of the light pinks,
spacing, motion, iconography.

## Conflicts

- The light pinks (`#ffa9b8`, `#f48c8c`) fail AA as text on white: backgrounds and decoration only.
- The site loads fonts from a CDN; the app must bundle them locally (no internet in the field).

## Open questions

- [ ] Does EIRA have a brand manual or official colors? — EIRA leadership
- [ ] Is showing "EIRA Movimiento Rosa" next to the product wordmark allowed? — EIRA leadership

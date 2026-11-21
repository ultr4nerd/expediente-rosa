---
title: Print
description: Print production rules (CMYK and spot values, bleed, resolution, small text) and token mapping
read_when: Producing cards, stickers, posters, packaging or any file that goes to a printer
status: draft
updated: 2026-11-21
---

# Print

Screens mix light (RGB), presses mix ink (CMYK or spot colors). A hex value is not a print color:
the print value of every brand color is decided once, recorded next to the token, and approved on a
physical proof. Follow the printer's own template when it differs from the defaults below.

## Constraints

- Color: record CMYK (and a Pantone reference for critical brand colors) per primitive color in
  `"$extensions": {"io.github.ultr4nerd.design": {"print": {"cmyk": [0, 80, 85, 0], "pantone": "..."}}}`.
  `design show <token>` prints it. Vivid RGB blues, greens and oranges shift most when converted.
- Files: PDF (PDF/X if the printer asks), fonts embedded or outlined, images at 300 ppi at final size.
- Bleed 3 mm (0.125 in) on every edge; keep text and logos at least 3 mm inside the trim.
- Small text: ink spreads and paper lowers contrast. Hold text to at least AA (prefer AAA) and avoid
  type below about 6 pt; use 100% black, not rich black, for small text.
- Units: 1 pt = 1/72 in and 1 CSS px = 1/96 in, so a 16px token is 12 pt.

## Office printing from the app (contingency sheet, ISS-0018)

The contingency sheet (`src/components/ContingencySheets.tsx`) is printed with `window.print()` on whatever
office or field printer is at hand, often black and white. Rules for it:

- Black on white only: lines and boxes use `border-foreground`; no pink fills, no background images.
- Tailwind `print:` variants hide the app (`print:hidden` on `#root` while the sheets are open) and drop
  card chrome (`print:border-0 print:shadow-none print:rounded-none`). One sheet per page with `break-after-page`.
- Write-in lines are `h-control` tall (44px ≈ 11.6 mm): enough for handwriting.
- Text stays at `type-caption` (14px ≈ 10.5 pt) or larger.

## Token mapping

| print element | token | print value |
|---|---|---|
| Sheet background | `color.surface-raised` on screen | paper white (backgrounds are not printed) |
| Text, lines and boxes | `color.on-surface` (`text-foreground`, `border-foreground`), `type.caption`+ | black; ≥ 10.5 pt |
| Paper folio box | `type.folio`, dashed `border-foreground` | black; dashed = "not final" like the provisional folio |

## Verify

- `design contrast` for every text/background pair (on screen values, then judge the proof).
- Printer preflight report, then a physical proof under daylight before the full run.

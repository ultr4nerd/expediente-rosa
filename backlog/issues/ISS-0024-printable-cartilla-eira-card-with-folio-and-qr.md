---
id: ISS-0024
title: Printable Cartilla EIRA card with folio and QR
kind: feature
status: done
priority: P2
area: ui
parent: ISS-0001
depends_on: []
created: 2026-11-21
updated: 2026-11-21
due:
owner:
branch:
estimate: S
tags: []
---

## Context
Print a small patient card (folio final or provisional, name, next suggested visit) with a QR encoding only the folio (no health data). Search accepts the folio typed or pasted from a scanner.

## Scope

## Acceptance criteria
- [x] print view from the patient record
- [x] QR encodes only the folio
- [x] search by scanned/typed folio opens the record

## Notes

## Log
- 2026-11-21 12:52 thread-c: started; plan in progress/ISS-0024.md
- 2026-11-21 12:55 thread-c: verify passed: pnpm verify
- 2026-11-21 12:55 thread-c: done: Shipped 'Imprimir Cartilla' on the patient header: print overlay (shared PrintOverlay, also used by the contingency s...

## Outcome
Shipped 'Imprimir Cartilla' on the patient header: print overlay (shared PrintOverlay, also used by the contingency sheets) with an ID-1 card (85.6x54 mm via new spacing tokens cartilla-w/h/qr): app icon + Expediente Rosa, folio (provisional styled dashed + 'provisional'), name, next suggested visit (earliest pending follow-up, else last visit + 1 year), and a QR (uqr 0.1.3, zero deps, MIT, bundled) encoding only the folio, ECC M with 4-module quiet zone. Search: a pasted/scanned folio with one exact match now opens the record on Enter. Verified with domain tests (card data, QR only folio + quiet zone, folio resolves via findByFolio and searchPatients). Not checked: print preview and scanning the printed QR with a phone.

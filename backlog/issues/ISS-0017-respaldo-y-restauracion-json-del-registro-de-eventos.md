---
id: ISS-0017
title: JSON backup and restore of the event log
kind: feature
status: done
priority: P1
area: ui
parent: ISS-0001
depends_on: [ISS-0002]
created: 2026-11-21
updated: 2026-11-21
due:
owner:
branch:
estimate: S
tags: []
---

## Context

## Scope

## Acceptance criteria
- [x] download JSON backup
- [x] importing into an empty instance rebuilds the patient records

## Notes

## Log
- 2026-11-21 12:15 thread-c: started; plan in progress/ISS-0017.md
- 2026-11-21 12:23 thread-c: verify passed: pnpm verify
- 2026-11-21 12:23 thread-c: done: Shipped BackupPanel on the sync screen: 'Descargar respaldo' writes {format,version,device,exportedAt,count,events} J...

## Outcome
Shipped BackupPanel on the sync screen: 'Descargar respaldo' writes {format,version,device,exportedAt,count,events} JSON named expediente-rosa-respaldo-<device>-<date>.json; 'Restaurar respaldo' parses (skips invalid entries, rejects foreign/newer files), appends via recordsSource (store dedups by id) and re-projects. Desktop: new Rust command save_export writes to Downloads (else <dataDir>/exports) with a sanitized name and shows the path; browser: Blob download. Verified: domain tests (round trip, restore into partly filled store adds only missing, restore twice adds 0), Rust unit test for save_to, app built and launched in Tauri; the click-through inside the Tauri window was NOT completed (headless input cannot type the PIN). Follow-up: backup file is plain JSON with personal data (not encrypted).

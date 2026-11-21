---
id: ISS-0016
title: Export CSV without personal data
kind: feature
status: done
priority: P1
area: domain
parent: ISS-0001
depends_on: [ISS-0003]
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
- [x] counts by service, site and month
- [x] no names, phones or folios

## Notes

## Log
- 2026-11-21 12:23 thread-c: started; plan in progress/ISS-0016.md
- 2026-11-21 12:24 thread-c: verify passed: pnpm verify
- 2026-11-21 12:24 thread-c: done: Shipped src/domain/csvExport.ts (countsByMonthSiteService over the projection: services and unique patients by month,...

## Outcome
Shipped src/domain/csvExport.ts (countsByMonthSiteService over the projection: services and unique patients by month, site and service; linked duplicates counted once via survivor ids; countsCsv with UTF-8 BOM and quoting) and an 'Exportar conteos (CSV)' button in the backup panel, saved via save_export/Blob. Verified with tests: totals match services, linked duplicate counted once, CSV contains no names, phones, cytology numbers or folios. Follow-up: small-cell suppression (counts < 5) if EIRA shares it outside.

---
title: Tauri 2 desktop app instead of a PWA
description: Why the client is Tauri 2 (Windows) with encrypted SQLite and not a PWA
read_when: Questioning the platform or local storage, or proposing a return to web/mobile
id: decisions-0001
status: current
updated: 2026-11-21
tags: [plataforma]
---
# Tauri 2 desktop app instead of a PWA

## Decision

The client is a Tauri 2 desktop app (target: Windows, 2 laptops per *jornada*, the field medical day). It stores data in encrypted SQLite on disk and does networking from Rust. The UI is React + TypeScript in the webview.

## Why

- **Durability and encryption:** IndexedDB is *best-effort* (it is wiped when the browser is cleared, Safari applies a 7-day cap, `persist()` guarantees nothing) and does not encrypt at rest. EIRA keeps records for 5 years and the laptops travel to communities: a theft exposes health data.
- **Local network:** a PWA served from a LAN IP loses the secure context, and an HTTPS PWA cannot call a local HTTP hub. Neither restriction applies from Rust.
- **Rejected alternatives:**
  - Mobile: EIRA uses laptops.
  - Native Rust UI (egui/Iced/Slint): more efficient, but worse at forms and accessibility, and slower to iterate.
  - Electron: much heavier.

## Consequences

- We must build for Windows (CI `windows-latest`); SQLCipher may fail to compile on Windows. In that case, encrypt each event's payload with pure Rust.
- The unsigned installer triggers SmartScreen; WebView2 ships with its offline installer.
- Plan B (PWA with Dexie) stays cheap because the domain lives in TS (decision 0005).

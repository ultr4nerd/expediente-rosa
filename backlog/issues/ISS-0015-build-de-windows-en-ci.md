---
id: ISS-0015
title: Windows build in CI
kind: feature
status: done
priority: P1
area: ci
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
GitHub Actions windows-latest with tauri-action; at most two fix attempts. If SQLCipher does not compile, document it and encrypt the payload in pure Rust.

## Scope

## Acceptance criteria
- [x] workflow runs on windows-latest
- [x] result (artifact or failure) documented in README

## Notes

## Log
- 2026-11-21 12:29 thread-a: started; plan in progress/ISS-0015.md
- 2026-11-21 12:55 thread-a: PR #23 run 44935881066 on windows-latest: success in ~17 min; SQLCipher (vendored OpenSSL + NASM) compiles on MSVC; artifact expediente-rosa-windows (MSI + NSIS, 10.9 MB). Main runs kept being cancelled by newer pushes (concurrency group).
- 2026-11-21 12:55 thread-a: verify passed: pnpm verify
- 2026-11-21 12:55 thread-a: done: Shipped .github/workflows/windows.yml: build-only on windows-latest (push to main, PRs, manual) with pnpm 12, Node 24...

## Outcome
Shipped .github/workflows/windows.yml: build-only on windows-latest (push to main, PRs, manual) with pnpm 12, Node 24, stable Rust, rust-cache, NASM and tauri-action@v1; uploads the MSI and NSIS installers as artifact expediente-rosa-windows. Verified: PR #23 run 44935881066 green on the first attempt (no fixes needed), artifact 10.9 MB; SQLCipher with vendored OpenSSL compiles on MSVC. README already states it compiles in CI but was never run on a Windows laptop. Untested: installing/running the installer on Windows, WebView2 offline. Installers are unsigned.

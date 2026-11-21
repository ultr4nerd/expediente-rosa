---
title: Product renamed to Hilo
description: The product name changes from Expediente Rosa to Hilo; repo, paths and identifiers keep expediente-rosa
read_when: Writing user-facing copy, the README, pitch or video, or touching names and identifiers
id: decisions-0008
status: current
updated: 2026-11-21
tags: [naming]
---

# Product renamed to Hilo

## Decision

The product is called **Hilo**, with the tagline "Una mujer, una historia." (the thread of each woman's care across visits and laptops). The app UI, window title, wordmark, README, pitch deck, video and Devpost use Hilo.

## Why

At the hackathon many teams independently named their Reto 1 project "Expediente Rosa", so the judges could mix projects up while deliberating. "Hilo" is short and distinctive, and it says what the product does: it keeps the thread of care unbroken.

## Consequences

- To avoid breaking scripts, data directories and links, the repository name, the Cargo crate, the bundle identifier (`org.eiraac.expedienterosa`), the file paths and the spec file names keep `expediente-rosa`.
- Historical docs and backlog issues may still say "Expediente Rosa".

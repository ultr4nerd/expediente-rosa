---
title: Internal artifacts in English, user-facing in Spanish
description: "Language policy: code, agent docs and backlog in English; app UI and README in Spanish"
read_when: Writing any doc, issue, commit, UI copy or the README
id: decisions-0006
status: current
updated: 2026-11-21
tags: [language, process]
---

# Internal artifacts in English, user-facing in Spanish

## Decision

Internal artifacts are written in English. That covers code, identifiers, comments, commit messages, AGENTS.md, docs (specs, decisions, learnings), backlog issues and design-system docs. User-facing artifacts are written in Spanish with correct accents: the app UI and its copy, `README.md`, and the pitch material.

## Why

Agents and contributors work best with one consistent internal language. EIRA's staff and the judges read Spanish, so everything they see must be in Spanish. Domain terms without a good English equivalent stay in Spanish with a gloss: *jornada*, *folio EIRA*, *Cartilla EIRA*, *capturista*, *citología*, BIRADS, Bethesda.

## Consequences

- UI strings live in Spanish in the components. No i18n layer for the MVP.
- `README.md` is written for judges: accessible, in Spanish, with screenshots and the real / simulated / untested table. Agent-oriented detail goes to AGENTS.md and `docs/`, never the README.

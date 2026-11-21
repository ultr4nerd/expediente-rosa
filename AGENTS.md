# AGENTS.md

Entry point for any agent (Claude Code, Codex, Gemini CLI, Cursor, Devin) or human working in **Expediente Rosa**: a desktop app (Tauri 2) giving EIRA Movimiento Rosa A.C. a single patient record that works offline. Built at the Vibeathon Nerdearla México 2026 (Reto 1). `CLAUDE.md`, `GEMINI.md` and `.github/copilot-instructions.md` point here.

**Language (decision 0006):**

- **Internal = English:** code, comments, commits, AGENTS.md, `docs/`, `backlog/`, `design/` docs.
- **User-facing = Spanish, with accents:** app UI copy, `README.md`, pitch material.

**Glossary.** These terms stay in Spanish:

- *jornada*: a field medical day in a community.
- *folio EIRA*: EIRA's yearly consecutive patient ID; provisional `A-0007` offline, final `2026-0143`.
- *Cartilla EIRA*: the patient's card.
- *capturista*: data-entry staff.
- *citología*: Pap smear request and report form.
- *revisión mamaria*: breast exam form.
- *reactivo N*: field number N on EIRA's paper forms.

## Map

| Path | What | Read when |
|---|---|---|
| `docs/specs/mvp-expediente-rosa.md` | Closed MVP scope, event model, demo script, timeline | Before building or cutting any feature |
| `docs/specs/hackathon-brief.md` | Reto 1 statement, judging criteria, Devpost deliverables, EIRA limits | Before the demo, the README or any scope cut |
| `docs/specs/eira-context-and-real-forms.md` | EIRA operation, real form fields, mentor answers | Designing forms, fields, roles, autofill or validation |
| `docs/INDEX.md` | Indexed docs: decisions and learnings (`pnpm docmap find <terms>`) | Before changing architecture, tooling or process |
| `backlog/INDEX.md` | Open work (`pnpm backlog next`) | Picking what to do |
| `progress/<ID>.md` | Live plan of an issue in progress | Resuming someone else's work |
| `design/DESIGN.md` | Design system entry point (tokens in `design/tokens.json`) | Any UI work |
| `src/domain/` | Pure TS domain: events, projection, matching, autofill, validation | Changing business rules |
| `src-tauri/src/` | Rust: encrypted event store (SQLCipher) and sync transport | Storage, encryption, network |
| `server/` | Central sync: Hono + Valkey (stream, dedup, folio counter) | Sync protocol or folio assignment |

## Commands

```sh
pnpm install
pnpm tauri dev                                   # desktop app (needs Rust; on this Mac: export PATH="/opt/homebrew/opt/rustup/bin:$PATH")
ER_DATA_DIR=/tmp/er-b ER_DEVICE=B pnpm tauri dev # second instance for sync demos
docker compose -f server/compose.yaml up         # central: Valkey + Hono
pnpm verify                                      # typecheck + tests + docmap/backlog/design checks
```

## Hard rules

1. `pnpm verify` must be green before starting and before closing work.
2. Work goes through an issue: `pnpm backlog start <ID> --owner <me>` (or `next --claim`). Log as you go and close with `done` and an Outcome. Small or exploratory tasks do not need one.
3. A rule or a choice between alternatives is a decision in `docs/decisions/`, never a comment. A mistake worth avoiding becomes a check when one can catch it, and a learning in `docs/learnings/`.
4. Blocked means stop: `pnpm backlog block <ID> "<reason>"` and end the turn.
5. EIRA's limits:
   - Never use the name as an identifier.
   - Never merge records without human confirmation; linking is an event.
   - Never put diagnoses or findings in notifications or exports.
   - Fictitious data only: never real patients.
6. Records are immutable events (decision 0002): never update or delete an event; corrections are new events with `prev`.
7. Domain logic lives in `src/domain/` as pure, tested functions (decision 0005). Rust stays thin: store and transport.
8. UI uses semantic tokens only (`design/DESIGN.md`): no hex values, raw px or palette classes. `pnpm design check` must pass.
9. Every demo-facing claim says what is real, simulated or untested. Do not overstate.
10. `README.md` is for the judges: accessible Spanish. It covers what it is, the problem, a demo/screenshots, how to run it, the real / simulated / untested table, architecture in a few lines, risks, costs, operation, next steps and open questions. Agent and process detail belongs here and in `docs/`, never in the README.

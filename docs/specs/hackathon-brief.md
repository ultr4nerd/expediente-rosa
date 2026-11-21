---
title: Hackathon brief
description: Reto 1 statement, judging criteria, Devpost deliverables, EIRA limits and cross-cutting requirements
read_when: Before the demo, the README or any scope cut; when checking what the judges score
id: hackathon-brief
status: current
updated: 2026-11-21
tags: [hackathon, judging]
---

# Hackathon brief

Source: the Devpost page (vibeathon-mexico-2026.devpost.com, overview, rules and resources) and EIRA's participant guide (PDF linked from Resources). This is a summary; when in doubt, re-read the source.

## Goal

Win Reto 1 of the **Nerdearla Vibeathon by Devin, México 2026**, held in person on 21 Nov 2026 at Amazon CDMX (Puerta Polanco).

- **Submission deadline:** 16:00 CST on Devpost. We submit at 15:40.
- **Demos and pitches:** from 16:00. Winners are announced at 17:00.
- **Prizes:** trips to Nerdearla Madrid (1st), Buenos Aires (2nd) and Santiago (3rd).
- **Sponsors:** Devin, AWS, Valkey, CNCF.

## Scope

**Reto 1, "Expediente digital único y registro de pacientes".** Design a registration and lookup mechanism that recognizes a returning patient, keeps her service history and updates only what is needed, even with intermittent connectivity. Today patients are identified by full name, so a woman who comes four times a year may be registered four times.

What EIRA wants:

- A stable internal ID per patient, with visits and services recorded separately.
- Multi-attribute match search, with human confirmation before linking records. Never auto-merge.
- Local capture without internet and secure sync with conflict detection.
- Capture, clinical and admin roles, plus a change log.
- Update history and contact data without erasing the history of changes; a clinical timeline.
- Export operational data and statistics without exposing unnecessary sensitive data.

**Practice case.** Fictitious "María Ejemplo" has a Pap smear in February and returns in May for an ultrasound. The system must:

1. Find her record and confirm she is the same person.
2. Update a contact field and add the new visit.
3. If the internet drops, keep the capture and sync when it returns.
4. Never auto-merge a different patient with a similar name.

**One-day prototype demonstrates:** registering a fictitious patient, search and match detection, a second visit with history, a verifiable offline simulation, and an explanation of access control and sync.

Out of scope: Retos 2-4 (municipal coordination, impact dashboards, Pap result delivery).

## Requirements

**Devpost deliverables** (proposals that miss them are not judged):

1. A working project for one challenge, built during the event (10:30-16:00). Teams of 1-4, all registered on Devpost and Nerdearla.
2. A 2-minute demo pitch showing the project in action.
3. A public repo with an open-source license, and a README explaining how to run it and which credentials or services it needs.
4. Following EIRA's guide, the submission includes:
   - an end-to-end prototype with fictitious data;
   - a brief explanation of architecture, technologies, dependencies and design choices, **separating what is implemented from what is simulated**;
   - risks, security needs, operation, costs and next steps for a real pilot;
   - open questions and assumptions to validate with EIRA.

**EIRA's limits.** Breaking any of these disqualifies the approach:

- Never use the name as a unique ID, and never merge records without human confirmation.
- No real patient data.
- Protect health data, and plan for backup, recovery and a contingency when technology fails.
- The hackathon is not a deployment authorization: any clinical use needs EIRA's later review (a scoped pilot plus legal and data-protection analysis).

**Cross-cutting requirements** (apply to every challenge):

| Requirement | What it means |
|---|---|
| Accessibility | Clear UI, simple instructions, works on the computers available, alternatives for people with limited digital skills |
| Connectivity | What works offline, how it syncs, what happens on conflicts or failures |
| Privacy | Minimal data, role permissions, encryption, authentication, access logs, retention and deletion policies |
| Operation | Who runs it, what training it needs, how data is backed up, how incidents are handled |
| Sustainability | Dependencies, external services, licenses, recurring costs, maintenance options |
| Interoperability | Export in open formats; data never trapped in one tool |

"A complete critical flow, even if narrow, beats many screens that don't work."

## Acceptance criteria

The judging criteria (Devpost lists no weights):

| Criterion | Question the judges ask |
|---|---|
| Usabilidad | Clear and easy for EIRA staff (field brigades, coordination, medical team), considering limited connectivity and different digital skills? |
| Impacto | Solves the core problems of the challenge as EIRA's guide describes them, reducing repetitive work or real operational risks? |
| Escalabilidad | Adapts to new campaigns, communities or organizations without big changes? |
| Privacidad y confianza | Takes care of patients' health data? |
| Innovación | Creative features that add extra value? |
| Funcionamiento real del prototipo | Does the critical flow work end to end with fictitious data? Is it clear what is implemented vs simulated, and what a real pilot needs? |

Judges:

- Martí Cristobal
- Jazmin Ivette Reyes Serrano
- Gael Hernández (FDE, Orbitware / Cognition)
- Roberto Luna Rojas (Sr Developer Advocate, Valkey)
- Ximena Cruz (Nerdearla)
- Valeria Rivera Contreras

## Open questions

Owner: team. Still open with EIRA's mentors; tracked in [mvp-expediente-rosa.md](mvp-expediente-rosa.md).

- Does Devpost require a recorded video, or is the live pitch enough? Ask the organizers, and keep a backup recording either way.

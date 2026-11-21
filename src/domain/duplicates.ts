// Probable duplicates created offline on different devices, detected after a sync pull.
// Returns link proposals only: a human confirms, then the UI appends `patients.linked` (EIRA limit).
import type { EventEnvelope } from "./events";
import { isFinalFolio, newEvent, type Actor } from "./factory";
import { scoreCandidate, type MatchCandidate, type MatchResult } from "./matching";

/** A record with where it was created. `PatientRecord` from projection.ts satisfies it. */
export interface DuplicateCandidate extends MatchCandidate {
  created?: { device: string; at: string };
}

export interface LinkProposal {
  /** Record that keeps its folio (final folio first, then the oldest). */
  survivorId: string;
  /** Record whose folios become aliases of the survivor. */
  aliasId: string;
  score: number;
  /** Spanish reasons, strongest first. */
  reasons: string[];
  match: MatchResult;
}

export interface DuplicateOptions {
  /** Minimum score (default 0.8). */
  minScore?: number;
  /** Also compare records created on the same device (default false: duplicates come from offline laptops). */
  sameDevice?: boolean;
  /** Only proposals involving at least one of these patient ids (e.g. those just pulled by sync). */
  onlyIds?: readonly string[];
}

/** Survivor first: a final folio wins, then the earliest creation, then the smaller id. */
function survivorFirst(a: DuplicateCandidate, b: DuplicateCandidate): [DuplicateCandidate, DuplicateCandidate] {
  const fa = isFinalFolio(a.folio);
  const fb = isFinalFolio(b.folio);
  if (fa !== fb) return fa ? [a, b] : [b, a];
  const ta = a.created?.at ?? "";
  const tb = b.created?.at ?? "";
  if (ta !== tb) return ta && (!tb || ta < tb) ? [a, b] : [b, a];
  return a.patientId < b.patientId ? [a, b] : [b, a];
}

/**
 * Pairs of active records that are probably the same person. The name is never enough on its
 * own: a proposal needs a similar name plus the same birth date or the same last 4 phone digits.
 * Pairs marked distinct are never proposed. Deterministic order: score desc, then ids.
 */
export function findDuplicateProposals(records: readonly DuplicateCandidate[], opts: DuplicateOptions = {}): LinkProposal[] {
  const { minScore = 0.8, sameDevice = false, onlyIds } = opts;
  const only = onlyIds ? new Set(onlyIds) : null;
  const active = records.filter((r) => r.status !== "alias").sort((a, b) => (a.patientId < b.patientId ? -1 : 1));
  const out: LinkProposal[] = [];

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      if (only && !only.has(a.patientId) && !only.has(b.patientId)) continue;
      if (a.distinctFrom?.includes(b.patientId) || b.distinctFrom?.includes(a.patientId)) continue;
      if (!sameDevice && a.created && b.created && a.created.device === b.created.device) continue;

      const [survivor, alias] = survivorFirst(a, b);
      const id = alias.identity;
      const match = scoreCandidate(
        { fullName: id.fullName, birthDate: id.birthDate, phone: id.phone, municipality: id.municipality, birthState: id.birthState },
        survivor,
      );
      const s = match.signals;
      if ((s.name ?? 0) < 0.85) continue;
      if (s.birthDate !== "same" && s.phone !== "same") continue;
      if (match.score < minScore) continue;

      const reasons = [...match.reasons];
      if (a.created && b.created && a.created.device !== b.created.device) {
        reasons.push(`Registradas en laptops distintas (${survivor.created!.device} y ${alias.created!.device})`);
      }
      out.push({ survivorId: survivor.patientId, aliasId: alias.patientId, score: match.score, reasons, match });
    }
  }
  return out.sort((x, y) => y.score - x.score || (x.survivorId + x.aliasId < y.survivorId + y.aliasId ? -1 : 1));
}

/** Event to append once a human confirms a proposal. */
export function confirmLink(
  proposal: Pick<LinkProposal, "survivorId" | "aliasId">,
  actor: Actor,
  reason = "Misma persona registrada en dos equipos sin red (confirmado por personal EIRA)",
  opts: { id?: string; at?: string } = {},
): EventEnvelope<"patients.linked"> {
  return newEvent("patients.linked", proposal.survivorId, { survivorId: proposal.survivorId, aliasId: proposal.aliasId, reason }, actor, opts);
}

/** Event to append when a human says the two records are different people. */
export function rejectLink(
  proposal: Pick<LinkProposal, "survivorId" | "aliasId">,
  actor: Actor,
  opts: { id?: string; at?: string } = {},
): EventEnvelope<"patients.marked_distinct"> {
  return newEvent("patients.marked_distinct", proposal.survivorId, { otherPatientId: proposal.aliasId }, actor, opts);
}

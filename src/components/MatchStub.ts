// TEMPORARY stub for ISS-0009 until thread C lands src/domain/matching.ts (ISS-0007) and
// src/domain/projection.ts (ISS-0003). Same idea, same output shape: candidates with a score and
// human-readable reasons, never an automatic action. Swap the imports in SearchScreen and delete this.
import type { AnyEvent, Identity } from "@/domain/events";

export interface MatchablePatient {
  patientId: string;
  identity: Identity;
  folio: string;
  provisionalFolio: string;
  /** Patients a human confirmed as different people. */
  distinctFrom: string[];
}

export interface MatchReason {
  /** Stable key, e.g. "folio", "phone", "name-exact", "name-similar", "birthdate". */
  kind: string;
  /** Spanish, shown as-is ("Teléfono igual"). */
  label: string;
}

export interface MatchCandidate {
  patientId: string;
  /** 0..1, for ordering only; the UI never decides on it. */
  score: number;
  reasons: MatchReason[];
}

/** Minimal read model from the event log (identity, folio, distinct pairs; linked aliases hidden). */
export function matchablePatients(events: AnyEvent[]): MatchablePatient[] {
  const byId = new Map<string, MatchablePatient>();
  const aliases = new Set<string>();
  for (const e of events) {
    if (e.type === "patient.created") {
      byId.set(e.patientId, {
        patientId: e.patientId,
        identity: { ...e.payload.identity },
        folio: e.payload.provisionalFolio,
        provisionalFolio: e.payload.provisionalFolio,
        distinctFrom: [],
      });
    }
  }
  for (const e of events) {
    const p = byId.get(e.patientId);
    if (e.type === "folio.assigned" && p) p.folio = e.payload.folio;
    if (e.type === "field.updated" && p && e.payload.field.startsWith("identity.")) {
      (p.identity as unknown as Record<string, unknown>)[e.payload.field.slice(9)] = e.payload.value;
    }
    if (e.type === "patients.marked_distinct") {
      const other = byId.get(e.payload.otherPatientId);
      if (p && other) {
        p.distinctFrom.push(other.patientId);
        other.distinctFrom.push(p.patientId);
      }
    }
    if (e.type === "patients.linked") aliases.add(e.payload.aliasId);
  }
  return [...byId.values()].filter((p) => !aliases.has(p.patientId));
}

const ABBREVIATIONS: Record<string, string> = {
  ma: "maria", "ma.": "maria", gpe: "guadalupe", "gpe.": "guadalupe",
};

export function normalizeName(s: string): string[] {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/\s+/)
    .map((t) => ABBREVIATIONS[t] ?? t.replace(/[^a-zñ]/g, ""))
    .filter((t) => t.length > 0);
}

function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const am = new Array<boolean>(a.length).fill(false);
  const bm = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = Math.max(0, i - range); j < Math.min(b.length, i + range + 1); j++) {
      if (bm[j] || a[i] !== b[j]) continue;
      am[i] = bm[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let t = 0;
  for (let i = 0, k = 0; i < a.length; i++) {
    if (!am[i]) continue;
    while (!bm[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < 4 && a[prefix] === b[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Ranked candidates for a free-text query: name, folio, phone and/or DD/MM/AAAA birth date. */
export function findCandidates(query: string, patients: MatchablePatient[]): MatchCandidate[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const dateMatch = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(q);
  const birthDate = dateMatch
    ? `${dateMatch[3]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`
    : null;
  const rest = dateMatch ? q.replace(dateMatch[0], " ") : q;
  const folioQuery = /^[a-z]-?\d{1,4}$|^\d{4}-\d{1,4}$/i.test(rest.trim()) ? rest.trim().toUpperCase() : null;
  const digits = folioQuery ? "" : rest.replace(/\D/g, "");
  const nameTokens = normalizeName(rest.replace(/\d/g, " "));

  const out: MatchCandidate[] = [];
  for (const p of patients) {
    const reasons: MatchReason[] = [];
    let score = 0;

    if (folioQuery) {
      const norm = (f: string) => f.toUpperCase().replace(/^([A-Z])-?0*(\d+)$/, "$1-$2").replace(/^(\d{4})-0*(\d+)$/, "$1-$2");
      const hit = [p.folio, p.provisionalFolio].find((f) => norm(f) === norm(folioQuery));
      if (hit) { reasons.push({ kind: "folio", label: `Mismo folio (${hit})` }); score = 1; }
    }

    if (digits.length >= 4) {
      const phones = [p.identity.phone, p.identity.phoneAlt].filter(Boolean) as string[];
      if (phones.some((ph) => ph === digits)) { reasons.push({ kind: "phone", label: "Teléfono igual" }); score = Math.max(score, 0.95); }
      else if (digits.length === 4 && phones.some((ph) => ph.endsWith(digits))) {
        reasons.push({ kind: "phone-last4", label: `Teléfono termina en ${digits}` });
        score = Math.max(score, 0.6);
      }
    }

    if (nameTokens.length) {
      const target = normalizeName(p.identity.fullName);
      let sum = 0;
      let edits = 0;
      let exact = 0;
      const used: number[] = [];
      for (const t of nameTokens) {
        let best = 0;
        let bestIdx = -1;
        target.forEach((tt, i) => {
          const s = jaroWinkler(t, tt);
          if (s > best) { best = s; bestIdx = i; }
        });
        sum += best;
        if (bestIdx >= 0) {
          used.push(bestIdx);
          const d = levenshtein(t, target[bestIdx]);
          edits += d;
          if (d === 0) exact++;
        }
      }
      const sim = sum / nameTokens.length;
      const inOrder = used.every((v, i) => i === 0 || v > used[i - 1]);
      if (exact === nameTokens.length) {
        reasons.push({ kind: "name-exact", label: inOrder ? "Mismo nombre" : "Mismos nombres, en otro orden" });
        score = Math.max(score, 0.9);
      } else if (sim >= 0.86) {
        reasons.push({
          kind: "name-similar",
          label: `Nombre parecido: ${plural(edits, "letra distinta", "letras distintas")}`,
        });
        score = Math.max(score, sim * 0.85);
      }
    }

    if (birthDate && p.identity.birthDate === birthDate) {
      reasons.push({ kind: "birthdate", label: "Misma fecha de nacimiento" });
      score = Math.min(1, score + 0.2) || 0.5;
    }

    if (reasons.length) out.push({ patientId: p.patientId, score, reasons });
  }
  return out.sort((a, b) => b.score - a.score || b.reasons.length - a.reasons.length).slice(0, 8);
}

// Candidate matching for patient search and duplicate detection. Pure functions.
// Never decides: it only ranks candidates with Spanish reasons for a human to confirm (EIRA limit).
import type { Identity } from "./events";

/** What matching needs from a patient record. `PatientRecord` from projection.ts satisfies it. */
export interface MatchCandidate {
  patientId: string;
  identity: Identity;
  folio: string;
  folioAliases?: string[];
  provisionalFolio?: string;
  finalFolio?: string;
  distinctFrom?: string[];
  status?: "active" | "alias";
}

/** Whatever the capturista typed; every field is optional. */
export interface MatchQuery {
  fullName?: string;
  birthDate?: string;
  phone?: string;
  municipality?: string;
  birthState?: string;
}

export interface MatchSignals {
  name?: number;
  birthDate?: "same" | "close" | "different";
  phone?: "same" | "different";
  municipality?: "same" | "different";
  curpKey?: "same" | "different";
}

export interface MatchResult {
  patientId: string;
  /** 0..1, for ranking only. */
  score: number;
  /** Human-readable Spanish reasons, strongest first. */
  reasons: string[];
  signals: MatchSignals;
  candidate: MatchCandidate;
}

// ---------------------------------------------------------------------------
// Normalization

const CONNECTORS = new Set(["de", "del", "la", "las", "los", "y", "e", "da", "van", "von", "vda", "viuda"]);

// Keys are normalized tokens ("Ma." normalizes to "ma").
const ABBREVIATIONS: Record<string, string> = {
  ma: "maria",
  gpe: "guadalupe",
  lupe: "guadalupe",
  fco: "francisco",
  fca: "francisca",
};

/** Lowercase, strip accents and punctuation, collapse spaces. "Ma. Guadalupe" -> "ma guadalupe". */
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Name tokens: normalized, abbreviations expanded, connectors (de, del, la...) dropped. */
export function nameTokens(name: string): string[] {
  const out: string[] = [];
  for (const raw of normalizeText(name).split(" ")) {
    if (!raw) continue;
    const expanded = ABBREVIATIONS[raw] ?? raw;
    for (const t of expanded.split(" ")) if (t && !CONNECTORS.has(t)) out.push(t);
  }
  return out;
}

/** Canonical form of a name for display/debugging: "Ma. de la Luz" -> "maria luz". */
export const normalizeName = (name: string) => nameTokens(name).join(" ");

export const digitsOnly = (s: string) => s.replace(/\D/g, "");
export const last4 = (phone?: string) => (phone ? digitsOnly(phone).slice(-4) : "");

// ---------------------------------------------------------------------------
// Jaro-Winkler

export function jaro(a: string, b: string): number {
  if (a === b) return a.length ? 1 : 0;
  if (!a.length || !b.length) return 0;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const am = new Array<boolean>(a.length).fill(false);
  const bm = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - range);
    const hi = Math.min(i + range + 1, b.length);
    for (let j = lo; j < hi; j++) {
      if (bm[j] || a[i] !== b[j]) continue;
      am[i] = bm[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let t = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!am[i]) continue;
    while (!bm[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  return (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3;
}

export function jaroWinkler(a: string, b: string, p = 0.1): number {
  const j = jaro(a, b);
  let l = 0;
  while (l < 4 && l < a.length && l < b.length && a[l] === b[l]) l++;
  return j + l * p * (1 - j);
}

/**
 * Name similarity 0..1, robust to word order ("Ejemplo María") and missing words.
 * Each token of the shorter name is aligned to its best match in the longer one.
 */
export function nameSimilarity(a: string, b: string): number {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.length || !tb.length) return 0;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const used = new Set<number>();
  let sum = 0;
  for (const t of short) {
    let best = 0;
    let bestJ = -1;
    long.forEach((u, j) => {
      if (used.has(j)) return;
      const s = jaroWinkler(t, u);
      if (s > best) {
        best = s;
        bestJ = j;
      }
    });
    if (bestJ >= 0) used.add(bestJ);
    sum += best;
  }
  const aligned = sum / short.length;
  // Missing words cost a little: "María Ejemplo" vs "María Ejemplo Ramírez" is still very close.
  const coverage = 0.9 + 0.1 * (short.length / long.length);
  const whole = jaroWinkler([...ta].sort().join(" "), [...tb].sort().join(" "));
  return Math.min(1, Math.max(aligned * coverage, whole));
}

// ---------------------------------------------------------------------------
// CURP-like key (first 16 characters, no homoclave). Only groups candidates; never an official ID.

const STATE_CODES: Record<string, string> = {
  aguascalientes: "AS", "baja california": "BC", "baja california sur": "BS", campeche: "CC", coahuila: "CL",
  colima: "CM", chiapas: "CS", chihuahua: "CH", "ciudad de mexico": "DF", cdmx: "DF", durango: "DG",
  guanajuato: "GT", guerrero: "GR", hidalgo: "HG", jalisco: "JC", "estado de mexico": "MC", mexico: "MC",
  michoacan: "MN", morelos: "MS", nayarit: "NT", "nuevo leon": "NL", oaxaca: "OC", puebla: "PL",
  queretaro: "QT", "quintana roo": "QR", "san luis potosi": "SP", sinaloa: "SL", sonora: "SR", tabasco: "TC",
  tamaulipas: "TS", tlaxcala: "TL", veracruz: "VZ", yucatan: "YN", zacatecas: "ZS",
};

const VOWELS = "AEIOU";
const isVowel = (c: string) => VOWELS.includes(c);
const firstInnerVowel = (w: string) => [...w.slice(1)].find(isVowel) ?? "X";
const firstInnerConsonant = (w: string) => [...w.slice(1)].find((c) => !isVowel(c)) ?? "X";

export function stateCode(state: string): string {
  return STATE_CODES[normalizeText(state)] ?? "NE";
}

/** Splits a Mexican full name "Nombre(s) Apellido1 Apellido2" into parts, ignoring connectors. */
export function splitName(fullName: string): { given: string[]; surname1: string; surname2: string } {
  const t = nameTokens(fullName).map((x) => x.toUpperCase().replace(/Ñ/g, "X"));
  if (t.length === 0) return { given: [], surname1: "", surname2: "" };
  if (t.length === 1) return { given: t, surname1: "", surname2: "" };
  if (t.length === 2) return { given: [t[0]], surname1: t[1], surname2: "" };
  return { given: t.slice(0, -2), surname1: t[t.length - 2], surname2: t[t.length - 1] };
}

/**
 * CURP-like key: 16 chars computed from name, birth date, sex "M" (mujer) and birth state.
 * Approximate (no homoclave, no offensive-word table); used only to group candidates.
 */
export function curpKey(identity: Pick<Identity, "fullName" | "birthDate" | "birthState">): string {
  const { given, surname1, surname2 } = splitName(identity.fullName);
  // CURP skips "María"/"José" when followed by another given name.
  const name = given.length > 1 && (given[0] === "MARIA" || given[0] === "JOSE") ? given[1] : given[0] ?? "X";
  const s1 = surname1 || "X";
  const date = digitsOnly(identity.birthDate);
  const yymmdd = date.length === 8 ? date.slice(2) : "000000";
  return (
    s1[0] + firstInnerVowel(s1) + (surname2 ? surname2[0] : "X") + name[0] +
    yymmdd + "M" + stateCode(identity.birthState) +
    firstInnerConsonant(s1) + (surname2 ? firstInnerConsonant(surname2) : "X") + firstInnerConsonant(name)
  );
}

// ---------------------------------------------------------------------------
// EIRA key: the ID EIRA uses today on paper, e.g. "Mauricio Chávez Olea", 21/12/1998 -> "CHOM981221".
// 2 letters of the first surname + 1 of the second + 1 of the first given name + YYMMDD.
// Two different people can share it, so it is a search/matching aid, never the unique identifier.

const EIRA_KEY_RE = /^\s*[A-Za-zÑñ]{4}\s*\d{6}\s*$/;

/** True when the text looks like an EIRA key ("CHOM981221"). */
export const looksLikeEiraKey = (text: string) => EIRA_KEY_RE.test(text);

export function eiraKey(identity: Pick<Identity, "fullName" | "birthDate">): string {
  const { given, surname1, surname2 } = splitName(identity.fullName);
  const s1 = (surname1 || "XX").padEnd(2, "X").slice(0, 2);
  const s2 = surname2 ? surname2[0] : "X";
  const n = given[0]?.[0] ?? "X";
  const date = digitsOnly(identity.birthDate);
  return s1 + s2 + n + (date.length === 8 ? date.slice(2) : "000000");
}

/** Records whose computed EIRA key equals the query. Can return several people: a human confirms. */
export function searchByEiraKey(text: string, candidates: readonly MatchCandidate[]): MatchResult[] {
  const q = text.replace(/\s/g, "").toUpperCase().replace(/Ñ/g, "X");
  const out: MatchResult[] = [];
  for (const c of candidates) {
    if (c.status === "alias") continue;
    if (eiraKey(c.identity) !== q) continue;
    out.push({ patientId: c.patientId, score: 0.9, reasons: [`Misma clave EIRA (${q})`], signals: {}, candidate: c });
  }
  if (out.length > 1) for (const r of out) r.reasons.push("Otra paciente comparte esta clave: confirma nombre y fecha");
  return out.sort((a, b) => (a.patientId < b.patientId ? -1 : 1));
}

// ---------------------------------------------------------------------------
// Matching

const WEIGHTS = { name: 0.45, birthDate: 0.3, phone: 0.15, municipality: 0.1 };

/** Two dates that differ by one digit or swapped day/month: typical capture errors. */
function closeDates(a: string, b: string): boolean {
  const da = digitsOnly(a);
  const db = digitsOnly(b);
  if (da.length !== 8 || db.length !== 8) return false;
  let diff = 0;
  for (let i = 0; i < 8; i++) if (da[i] !== db[i]) diff++;
  if (diff === 1) return true;
  return da.slice(0, 4) === db.slice(0, 4) && da.slice(4, 6) === db.slice(6, 8) && da.slice(6, 8) === db.slice(4, 6);
}

const pct = (x: number) => `${Math.round(x * 100)} %`;

/** Scores one candidate against a query. */
export function scoreCandidate(query: MatchQuery, c: MatchCandidate): MatchResult {
  const signals: MatchSignals = {};
  const strong: string[] = [];
  const weak: string[] = [];
  let total = 0;
  let weight = 0;

  if (query.fullName?.trim() && c.identity.fullName) {
    const s = nameSimilarity(query.fullName, c.identity.fullName);
    signals.name = s;
    total += WEIGHTS.name * s;
    weight += WEIGHTS.name;
    if (normalizeName(query.fullName) === normalizeName(c.identity.fullName)) strong.push("Mismo nombre");
    else (s >= 0.85 ? strong : weak).push(`Nombre ${pct(s)} parecido`);
  }
  if (query.birthDate && c.identity.birthDate) {
    weight += WEIGHTS.birthDate;
    if (query.birthDate === c.identity.birthDate) {
      signals.birthDate = "same";
      total += WEIGHTS.birthDate;
      strong.push("Misma fecha de nacimiento");
    } else if (closeDates(query.birthDate, c.identity.birthDate)) {
      signals.birthDate = "close";
      total += WEIGHTS.birthDate * 0.6;
      weak.push("Fecha de nacimiento casi igual (posible error de captura)");
    } else {
      signals.birthDate = "different";
      weak.push("Fecha de nacimiento distinta");
    }
  }
  const q4 = last4(query.phone);
  const c4s = [last4(c.identity.phone), last4(c.identity.phoneAlt)].filter(Boolean);
  if (q4.length === 4 && c4s.length) {
    weight += WEIGHTS.phone;
    if (c4s.includes(q4)) {
      signals.phone = "same";
      total += WEIGHTS.phone;
      strong.push("Mismos últimos 4 dígitos de teléfono");
    } else {
      signals.phone = "different";
      weak.push("Teléfono distinto");
    }
  }
  if (query.municipality?.trim() && c.identity.municipality) {
    weight += WEIGHTS.municipality;
    if (normalizeText(query.municipality) === normalizeText(c.identity.municipality)) {
      signals.municipality = "same";
      total += WEIGHTS.municipality;
      strong.push("Mismo municipio");
    } else {
      signals.municipality = "different";
      weak.push(`Otro municipio (${c.identity.municipality})`);
    }
  }
  if (query.fullName && query.birthDate && query.birthState && c.identity.birthState) {
    const same = curpKey({ fullName: query.fullName, birthDate: query.birthDate, birthState: query.birthState }) === curpKey(c.identity);
    signals.curpKey = same ? "same" : "different";
    if (same) strong.push("Misma clave tipo CURP (calculada, no oficial)");
  }

  const score = weight ? total / weight : 0;
  return { patientId: c.patientId, score: Math.round(score * 1000) / 1000, reasons: [...strong, ...weak], signals, candidate: c };
}

export interface MatchOptions {
  /** Minimum score to return (default 0.6). */
  minScore?: number;
  /** Maximum results (default 10). */
  limit?: number;
  /** When matching an existing record: skip it and every record marked distinct from it. */
  selfId?: string;
}

/** Ranked candidates for a query. Never merges or links: the UI asks a human. */
export function matchPatients(query: MatchQuery, candidates: readonly MatchCandidate[], opts: MatchOptions = {}): MatchResult[] {
  const { minScore = 0.6, limit = 10, selfId } = opts;
  const results: MatchResult[] = [];
  for (const c of candidates) {
    if (c.status === "alias") continue;
    if (selfId && (c.patientId === selfId || c.distinctFrom?.includes(selfId))) continue;
    const r = scoreCandidate(query, c);
    // A name that is clearly someone else is not a candidate, whatever else matches.
    if (r.signals.name !== undefined && r.signals.name < 0.75) continue;
    // A very similar name is always shown, so the human sees why it is (or is not) the same person.
    if (r.score >= minScore || (r.signals.name ?? 0) >= 0.85) results.push(r);
  }
  return results
    .sort((a, b) => b.score - a.score || (a.patientId < b.patientId ? -1 : 1))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Folio search

const FOLIO_RE = /^\s*(?:[Pp]?[A-Za-z]\s*-?\s*\d{1,6}|\d{4}\s*-\s*\d{1,6})\s*$/;

/** True when the text looks like a folio ("A-0007", "a7", "PA-0003", "2026-0143"). */
export const looksLikeFolio = (text: string) => FOLIO_RE.test(text);

/** Canonical folio: "a7" -> "A-0007", "2026-143" -> "2026-0143". */
export function normalizeFolio(text: string): string {
  const t = text.replace(/\s/g, "").toUpperCase();
  const prov = /^(P?[A-Z])-?(\d+)$/.exec(t); // "A-0007" provisional, "PA-0003" paper sheet
  if (prov) return `${prov[1]}-${prov[2].padStart(4, "0")}`;
  const fin = /^(\d{4})-(\d+)$/.exec(t);
  if (fin) return `${fin[1]}-${fin[2].padStart(4, "0")}`;
  return t;
}

/** Records whose current folio or any alias folio equals the query. Aliases resolve to their survivor upstream. */
export function searchByFolio(text: string, candidates: readonly MatchCandidate[]): MatchResult[] {
  const q = normalizeFolio(text);
  const out: MatchResult[] = [];
  for (const c of candidates) {
    if (c.status === "alias") continue;
    const all = [c.folio, c.provisionalFolio, c.finalFolio, ...(c.folioAliases ?? [])].filter(Boolean).map((f) => normalizeFolio(f!));
    if (!all.includes(q)) continue;
    const reason = normalizeFolio(c.folio) === q ? `Folio ${c.folio}` : `Folio anterior ${q} (ahora ${c.folio})`;
    out.push({ patientId: c.patientId, score: 1, reasons: [reason], signals: {}, candidate: c });
  }
  return out.sort((a, b) => (a.patientId < b.patientId ? -1 : 1));
}

/** One search box: a folio if it looks like one, otherwise a name. */
export function searchPatients(text: string, candidates: readonly MatchCandidate[], opts: MatchOptions = {}): MatchResult[] {
  if (!text.trim()) return [];
  if (looksLikeEiraKey(text)) return searchByEiraKey(text, candidates);
  if (looksLikeFolio(text)) return searchByFolio(text, candidates);
  return matchPatients({ fullName: text }, candidates, opts);
}

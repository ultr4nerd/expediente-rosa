// ISS-0018: printable contingency sheets for when a laptop fails. Paper folios use their own series
// ("PA-0001" for laptop A) so they never collide with the laptop's provisional folios ("A-0001").
// When a sheet is typed in later, a field.updated on PAPER_FOLIO_FIELD marks the record as coming
// from paper and keeps the paper folio searchable as an alias (see projection.ts).
import type { AnyEvent } from "./events";
import { newEvent, type Actor } from "./factory";
import { PAPER_FOLIO_FIELD } from "./projection";

export { PAPER_FOLIO_FIELD };

export const paperPrefix = (device: string) => `P${device.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 1) || "X"}`;

/** "PA-0003" -> 3 for device A, else 0. */
function paperNumber(folio: string, device: string): number {
  const m = new RegExp(`^${paperPrefix(device)}-(\\d+)$`).exec(folio.trim().toUpperCase());
  return m ? Number(m[1]) : 0;
}

/**
 * Next `count` paper folios for a device. Starts after the highest paper folio already typed in
 * and after `lastPrinted` (the last number this laptop printed), so reprints do not repeat numbers.
 */
export function nextPaperFolios(events: readonly AnyEvent[], device: string, count: number, lastPrinted = 0): string[] {
  let max = lastPrinted;
  for (const e of events) {
    if (e.type === "field.updated" && e.payload.field === PAPER_FOLIO_FIELD && typeof e.payload.value === "string") {
      max = Math.max(max, paperNumber(e.payload.value, device));
    }
  }
  return Array.from({ length: Math.max(0, count) }, (_, i) => `${paperPrefix(device)}-${String(max + i + 1).padStart(4, "0")}`);
}

/** Canonical paper folio or null if it does not look like one ("pa3" -> "PA-0003"). */
export function normalizePaperFolio(text: string): string | null {
  const m = /^\s*(P[A-Z])\s*-?\s*(\d{1,6})\s*$/i.exec(text);
  return m ? `${m[1].toUpperCase()}-${m[2].padStart(4, "0")}` : null;
}

/** Event that marks a just-registered patient as typed in from a paper sheet. */
export function paperIntakeEvent(patientId: string, paperFolio: string, actor: Actor, at?: string): AnyEvent {
  return newEvent("field.updated", patientId, { field: PAPER_FOLIO_FIELD, value: paperFolio, prev: null }, actor, { at });
}

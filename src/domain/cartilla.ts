// ISS-0024: data for the printable Cartilla EIRA card. The QR encodes ONLY the folio string:
// no name, no date, no clinical data (EIRA limit). Pure; uqr is a zero-dependency encoder.
import { encode } from "uqr";
import { isFinalFolio } from "./factory";
import { nextSuggestedVisit } from "./followUp";
import type { PatientRecord } from "./projection";

export interface CartillaData {
  folio: string;
  provisional: boolean;
  fullName: string;
  /** YYYY-MM-DD, or undefined when the record has no visits yet. */
  nextVisit?: string;
  /** What the QR encodes: exactly the folio. */
  qrText: string;
}

export function cartillaData(record: PatientRecord, today: string): CartillaData {
  return {
    folio: record.folio,
    provisional: !isFinalFolio(record.folio),
    fullName: record.identity.fullName,
    nextVisit: nextSuggestedVisit(record, today)?.date,
    qrText: record.folio,
  };
}

/** QR as an SVG path (one 1x1 square per dark module) plus the viewBox size, with a 4-module quiet zone. */
export function qrPath(text: string): { size: number; d: string } {
  const { data, size } = encode(text, { ecc: "M", border: 4 });
  let d = "";
  data.forEach((row, y) => row.forEach((dark, x) => { if (dark) d += `M${x} ${y}h1v1h-1z`; }));
  return { size, d };
}

/** Decodes the QR matrix back into a boolean grid (tests). */
export function qrMatrix(text: string): boolean[][] {
  return encode(text, { ecc: "M", border: 4 }).data;
}

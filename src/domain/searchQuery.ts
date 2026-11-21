// "Buscar antes de registrar": the search box understands a name, a DD/MM/AAAA date and phone digits.
// The same parse feeds the match query and the registration prefill, so what was typed is never retyped.
import type { MatchQuery } from "./matching";

/** Signals in a free-text search (not a folio): birthDate as YYYY-MM-DD, phone as digits (>= 4). */
export function parseSearchText(text: string): MatchQuery {
  const query: MatchQuery = {};
  let rest = text.trim();
  const date = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(rest);
  if (date) {
    query.birthDate = `${date[3]}-${date[2].padStart(2, "0")}-${date[1].padStart(2, "0")}`;
    rest = rest.replace(date[0], " ");
  }
  const digits = rest.replace(/\D/g, "");
  if (digits.length >= 4) query.phone = digits;
  const name = rest.replace(/[\d()+-]/g, " ").replace(/\s+/g, " ").trim();
  if (name.length >= 2) query.fullName = name;
  return query;
}

export interface RegistrationPrefill {
  fullName?: string;
  /** YYYY-MM-DD */
  birthDate?: string;
  /** Exactly 10 digits; partial phones (e.g. last 4) are search-only. */
  phone?: string;
}

/** What the registration form can take from the search text. A folio search prefills nothing. */
export function prefillFromSearch(text: string, isFolio: (t: string) => boolean): RegistrationPrefill {
  const t = text.trim();
  if (t.length < 2 || isFolio(t)) return {};
  const q = parseSearchText(t);
  const out: RegistrationPrefill = {};
  if (q.fullName) out.fullName = q.fullName;
  if (q.birthDate) out.birthDate = q.birthDate;
  if (q.phone && q.phone.length === 10) out.phone = q.phone;
  return out;
}

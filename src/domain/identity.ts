// Identity block helpers: age from birth date and validation against fatigue errors. Pure.
import type { Affiliation, Identity } from "./events";

/** Version of the privacy notice the patient accepts at registration. */
export const PRIVACY_NOTICE_VERSION = "2026-05";

export const MIN_AGE = 12;
export const MAX_AGE = 110;
/** Below this age the screen asks to double-check, without blocking. */
export const ADULT_AGE = 18;

/** Full years between a YYYY-MM-DD birth date and `today`; null if the date is not a real calendar date. */
export function ageOn(birthDate: string, today: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  let age = today.getFullYear() - y;
  const beforeBirthday =
    today.getMonth() < mo - 1 || (today.getMonth() === mo - 1 && today.getDate() < d);
  if (beforeBirthday) age--;
  return age;
}

/** Masks typed digits as DD/MM/AAAA: "1503198" -> "15/03/198". */
export function maskBirthDate(typed: string): string {
  const d = digitsOnly(typed).slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join("/");
}

/** "15/03/1985" -> "1985-03-15"; partial input is returned as typed so validation can ask to complete it. */
export function birthDateFromMask(masked: string): string {
  const d = digitsOnly(masked);
  return d.length === 8 ? `${d.slice(4, 8)}-${d.slice(2, 4)}-${d.slice(0, 2)}` : masked;
}

/** Collapses whitespace so "  ana   lópez " and "Ana López" compare the same way. */
export const normalizeSpaces = (s: string) => s.trim().replace(/\s+/g, " ");

/** Keeps digits only: "55 1234-5678" -> "5512345678". */
export const digitsOnly = (s: string) => s.replace(/\D/g, "");

export interface IdentityDraft {
  fullName: string;
  birthDate: string;
  birthState: string;
  residence: string;
  municipality: string;
  phone: string;
  phoneAlt: string;
  email: string;
  affiliation: Affiliation | "";
  affiliationNumber: string;
  hasCartilla: "si" | "no" | "";
}

export type IdentityField = keyof IdentityDraft;
export type IdentityErrors = Partial<Record<IdentityField, string>>;

export const emptyDraft = (): IdentityDraft => ({
  fullName: "",
  birthDate: "",
  birthState: "",
  residence: "",
  municipality: "",
  phone: "",
  phoneAlt: "",
  email: "",
  affiliation: "",
  affiliationNumber: "",
  hasCartilla: "",
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Field errors in Spanish (UI copy), in form order. Empty object = valid. */
export function validateIdentity(draft: IdentityDraft, today: Date = new Date()): IdentityErrors {
  const errors: IdentityErrors = {};
  const name = normalizeSpaces(draft.fullName);
  if (!name) errors.fullName = "Falta el nombre completo.";
  else if (name.split(" ").length < 2) errors.fullName = "Escribe nombre y al menos un apellido.";

  if (!draft.birthDate) errors.birthDate = "Falta la fecha de nacimiento.";
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.birthDate)) errors.birthDate = "Completa la fecha como DD/MM/AAAA.";
  else {
    const age = ageOn(draft.birthDate, today);
    if (age === null) errors.birthDate = "Esa fecha no existe. Revisa día, mes y año.";
    else if (age < 0) errors.birthDate = "La fecha de nacimiento está en el futuro.";
    else if (age < MIN_AGE) errors.birthDate = `Daría ${age} años. Revisa el año de nacimiento.`;
    else if (age > MAX_AGE) errors.birthDate = `Daría ${age} años. Revisa el año de nacimiento.`;
  }

  if (!draft.birthState) errors.birthState = "Elige la entidad de nacimiento.";
  if (!normalizeSpaces(draft.residence)) errors.residence = "Falta la residencia habitual.";
  if (!normalizeSpaces(draft.municipality)) errors.municipality = "Falta el municipio.";

  const phone = digitsOnly(draft.phone);
  if (phone && phone.length !== 10) errors.phone = "El teléfono debe tener 10 dígitos.";
  const phoneAlt = digitsOnly(draft.phoneAlt);
  if (phoneAlt && phoneAlt.length !== 10) errors.phoneAlt = "El otro teléfono debe tener 10 dígitos.";

  const email = draft.email.trim();
  if (email && !EMAIL.test(email)) errors.email = "El correo no parece válido. Revisa la @ y el dominio.";

  if (!draft.affiliation) errors.affiliation = "Elige la afiliación (o «Ninguna»).";
  if (!draft.hasCartilla) errors.hasCartilla = "Indica si cuenta con Cartilla EIRA.";
  return errors;
}

/** Builds the event payload identity from a valid draft (trimmed, optional fields omitted when empty). */
export function toIdentity(draft: IdentityDraft): Identity {
  const opt = (s: string) => (s ? s : undefined);
  const affiliation = draft.affiliation as Affiliation;
  const withNumber = affiliation !== "ninguno";
  return {
    fullName: normalizeSpaces(draft.fullName),
    birthDate: draft.birthDate,
    birthState: draft.birthState,
    residence: normalizeSpaces(draft.residence),
    municipality: normalizeSpaces(draft.municipality),
    phone: opt(digitsOnly(draft.phone)),
    phoneAlt: opt(digitsOnly(draft.phoneAlt)),
    email: opt(draft.email.trim()),
    affiliation,
    affiliationNumber: withNumber ? opt(draft.affiliationNumber.trim()) : undefined,
    hasCartilla: draft.hasCartilla === "si",
  };
}

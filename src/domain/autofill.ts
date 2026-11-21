// Autofill and validation for a new visit (ISS-0010). Pure functions over the projected record.
// Every autofilled value carries its source so the UI can show "Del historial · 12 feb 2026".
import type { CitologiaFields, Identity, MamaFields, StableHistory } from "./events";
import type { PatientRecord, ServiceRecord, VisitRecord } from "./projection";

export interface AutofillSource {
  /** Spanish label, e.g. "Citología del 12 feb 2026". */
  label: string;
  /** YYYY-MM-DD of the visit or event it comes from. */
  date?: string;
  eventId?: string;
}

export interface Autofilled<T> {
  value: T;
  source: AutofillSource;
}

export type CitologyKind = CitologiaFields["citologyKind"];

export interface VisitAutofill {
  /** Reactivo 11, computed from the last citología. */
  citologyKind: Autofilled<CitologyKind>;
  /** Reactivo 22.1: number of the last citología that had one. */
  previousCytologyNumber?: Autofilled<string>;
  /** Breast 16/16.1/16.2: last mammogram known from previous breast exams. */
  previousMammogram?: Autofilled<boolean>;
  lastMammogramDate?: Autofilled<string>;
  lastMammogramResult?: Autofilled<string>;
  /** Stable history to confirm instead of re-typing (undefined when nothing is known yet). */
  history?: Autofilled<StableHistory>;
  /** Identity fields reused as they are. */
  identityFields: Array<keyof Identity>;
  /** How many data items the form did not have to re-capture (ISS-0019 counter). */
  reusedCount: number;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-02-12" -> "12 feb 2026" (design/DESIGN.md date style). */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

export const CITOLOGY_KIND_LABEL: Record<CitologyKind, string> = {
  primera_vez: "Primera vez en la vida",
  primera_vez_3_anios: "Primera vez después de 3 años",
  subsecuente: "Subsecuente",
  complementaria_vph: "Complementaria VPH",
};

const visitDate = (record: PatientRecord, s: ServiceRecord): string =>
  record.visits.find((v: VisitRecord) => v.visitId === s.visitId)?.date ?? s.at.slice(0, 10);

/** Services of a type, oldest first by visit date then (at, id). */
function servicesByDate(record: PatientRecord, type: "citologia" | "mama"): Array<{ s: ServiceRecord; date: string }> {
  return record.visits
    .flatMap((v) => v.services)
    .filter((s) => s.serviceType === type)
    .map((s) => ({ s, date: visitDate(record, s) }))
    .sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.s.at < b.s.at ? -1 : a.s.at > b.s.at ? 1 : 0));
}

const addYears = (iso: string, years: number) => `${Number(iso.slice(0, 4)) + years}${iso.slice(4, 10)}`;

/** Reactivo 11 from the date of the last citología. */
export function citologyKindFor(lastCitologyDate: string | undefined, today: string): CitologyKind {
  if (!lastCitologyDate) return "primera_vez";
  return addYears(lastCitologyDate, 3) < today.slice(0, 10) ? "primera_vez_3_anios" : "subsecuente";
}

const IDENTITY_FIELDS: Array<keyof Identity> = [
  "fullName", "birthDate", "birthState", "residence", "municipality", "phone", "phoneAlt", "email",
  "affiliation", "affiliationNumber", "hasCartilla",
];

const hasValue = (v: unknown) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);

/** Everything a new visit can take from the record. `today` is YYYY-MM-DD. */
export function computeAutofill(record: PatientRecord, today: string): VisitAutofill {
  const citos = servicesByDate(record, "citologia");
  const lastCito = citos[citos.length - 1];
  const kind = citologyKindFor(lastCito?.date, today);
  const citologyKind: Autofilled<CitologyKind> = {
    value: kind,
    source: lastCito
      ? { label: `Última citología: ${formatDate(lastCito.date)}`, date: lastCito.date, eventId: lastCito.s.eventId }
      : { label: "Sin citologías previas en el expediente" },
  };

  const withNumber = [...citos].reverse().find((c) => c.s.cytologyNumber);
  const previousCytologyNumber = withNumber
    ? {
        value: withNumber.s.cytologyNumber!,
        source: { label: `Citología del ${formatDate(withNumber.date)}`, date: withNumber.date, eventId: withNumber.s.eventId },
      }
    : undefined;

  const out: VisitAutofill = { citologyKind, previousCytologyNumber, identityFields: [], reusedCount: 0 };

  const lastMamaWithMammogram = [...servicesByDate(record, "mama")]
    .reverse()
    .find((m) => (m.s.fields as MamaFields).previousMammogram);
  if (lastMamaWithMammogram) {
    const f = lastMamaWithMammogram.s.fields as MamaFields;
    const source: AutofillSource = {
      label: `Revisión mamaria del ${formatDate(lastMamaWithMammogram.date)}`,
      date: lastMamaWithMammogram.date,
      eventId: lastMamaWithMammogram.s.eventId,
    };
    out.previousMammogram = { value: true, source };
    if (f.lastMammogramDate) out.lastMammogramDate = { value: f.lastMammogramDate, source };
    if (f.lastMammogramResult) out.lastMammogramResult = { value: f.lastMammogramResult, source };
  }

  const historyKeys = Object.entries(record.history).filter(([, v]) => hasValue(v));
  if (historyKeys.length) {
    const date = (record.historyConfirmedAt ?? [...record.fieldHistory].reverse().find((f) => f.field.startsWith("history."))?.at)?.slice(0, 10);
    out.history = {
      value: { ...record.history },
      source: { label: date ? `Antecedentes confirmados el ${formatDate(date)}` : "Antecedentes del expediente", date },
    };
  }

  out.identityFields = IDENTITY_FIELDS.filter((k) => hasValue(record.identity[k]));
  out.reusedCount =
    out.identityFields.length +
    historyKeys.length +
    (kind !== "primera_vez" ? 1 : 0) +
    (previousCytologyNumber ? 1 : 0) +
    (out.previousMammogram ? 1 : 0) +
    (out.lastMammogramDate ? 1 : 0) +
    (out.lastMammogramResult ? 1 : 0);
  return out;
}

// ---------------------------------------------------------------------------
// Validation

export interface VisitDraft {
  site: string;
  /** YYYY-MM-DD */
  date: string;
  heightCm: string;
  weightKg: string;
  /** "120/80" */
  bloodPressure: string;
  glucose: string;
  lastMenstrualPeriod: string;
  reason: string;
  lastMammogramDate?: string;
}

export type VisitField = keyof VisitDraft;

export interface VisitValidation {
  /** Block saving. */
  errors: Partial<Record<VisitField, string>>;
  /** Shown next to the field; saving is allowed. */
  warnings: Partial<Record<VisitField, string>>;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s: string) => {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
const num = (s: string) => (s.trim() === "" ? undefined : Number(s.trim().replace(",", ".")));

interface Range {
  label: string;
  unit: string;
  hard: [number, number];
  soft: [number, number];
}

const RANGES: Record<"heightCm" | "weightKg" | "glucose", Range> = {
  heightCm: { label: "La talla", unit: "cm", hard: [50, 230], soft: [135, 190] },
  weightKg: { label: "El peso", unit: "kg", hard: [20, 300], soft: [35, 150] },
  glucose: { label: "La glucosa", unit: "mg/dL", hard: [20, 800], soft: [70, 200] },
};

/** Validation of the visit fields: impossible values block, unusual ones warn. `today` is YYYY-MM-DD. */
export function validateVisit(draft: VisitDraft, opts: { today: string; birthDate?: string }): VisitValidation {
  const errors: VisitValidation["errors"] = {};
  const warnings: VisitValidation["warnings"] = {};
  const today = opts.today.slice(0, 10);

  if (!draft.site.trim()) errors.site = "Falta la sede de la visita.";

  if (!draft.date) errors.date = "Falta la fecha de la visita.";
  else if (!validDate(draft.date)) errors.date = "La fecha no existe. Revísala.";
  else if (draft.date > today) errors.date = "La fecha de la visita no puede ser futura.";
  else if (opts.birthDate && draft.date < opts.birthDate) errors.date = "La fecha es anterior al nacimiento de la paciente.";
  else if (draft.date < addYears(today, -1)) warnings.date = "La visita es de hace más de un año. ¿Es correcto?";

  for (const key of ["heightCm", "weightKg", "glucose"] as const) {
    const v = num(draft[key]);
    if (v === undefined) continue;
    const r = RANGES[key];
    if (Number.isNaN(v)) errors[key] = `${r.label} debe ser un número.`;
    else if (v < r.hard[0] || v > r.hard[1]) errors[key] = `${r.label} de ${v} ${r.unit} no es posible. Revisa el dato.`;
    else if (v < r.soft[0] || v > r.soft[1]) warnings[key] = `${r.label} de ${v} ${r.unit} es poco común. Confirma el dato.`;
  }

  const bp = draft.bloodPressure.trim();
  if (bp) {
    const m = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec(bp);
    if (!m) errors.bloodPressure = "Escribe la presión como sistólica/diastólica, por ejemplo 120/80.";
    else {
      const [sys, dia] = [Number(m[1]), Number(m[2])];
      if (sys < 50 || sys > 300 || dia < 30 || dia > 200) errors.bloodPressure = `La presión ${sys}/${dia} no es posible. Revisa el dato.`;
      else if (sys <= dia) errors.bloodPressure = "La sistólica debe ser mayor que la diastólica.";
      else if (sys >= 140 || dia >= 90) warnings.bloodPressure = "Presión alta. Avisa al médico.";
      else if (sys < 90 || dia < 60) warnings.bloodPressure = "Presión baja. Avisa al médico.";
    }
  }

  for (const key of ["lastMenstrualPeriod", "lastMammogramDate"] as const) {
    const v = draft[key]?.trim();
    if (!v) continue;
    const what = key === "lastMenstrualPeriod" ? "La FUM" : "La fecha de la última mastografía";
    if (!validDate(v)) errors[key] = `${what} no existe. Revísala.`;
    else if (v > today || (draft.date && validDate(draft.date) && v > draft.date)) errors[key] = `${what} no puede ser posterior a la visita.`;
    else if (opts.birthDate && v < opts.birthDate) errors[key] = `${what} es anterior al nacimiento.`;
  }

  return { errors, warnings };
}

/** Parses the numeric visit fields for `visit.recorded` (call only after validation passed). */
export function visitNumbers(draft: VisitDraft): { heightCm?: number; weightKg?: number; glucose?: number } {
  return { heightCm: num(draft.heightCm), weightKg: num(draft.weightKg), glucose: num(draft.glucose) };
}

/**
 * `field.updated` payloads for stable-history keys that changed in this visit. `prev` points at the
 * last change of that field (null when it only came from `history.confirmed`).
 */
export function historyChanges(
  record: PatientRecord,
  before: StableHistory,
  after: StableHistory,
): Array<{ field: string; value: unknown; prev: string | null }> {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort() as Array<keyof StableHistory>;
  const out: Array<{ field: string; value: unknown; prev: string | null }> = [];
  for (const k of keys) {
    if (before[k] === undefined) continue; // new data goes in history.confirmed, not as a correction
    if (JSON.stringify(before[k]) === JSON.stringify(after[k])) continue;
    const field = `history.${k}`;
    const last = [...record.fieldHistory].reverse().find((f) => f.field === field);
    out.push({ field, value: after[k] ?? null, prev: last?.eventId ?? null });
  }
  return out;
}

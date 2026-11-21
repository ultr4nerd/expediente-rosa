// ISS-0020: per-field conflicts and their human resolution.
//
// A conflict happens when two devices edit the same field offline from the same starting point:
// both `field.updated` events carry the same `prev`. The projection flags the later one (by
// (at, id)) with `conflict: true` and, meanwhile, shows the latest value.
//
// Resolution rule (decided here):
// 1. A field has an OPEN conflict when its head (latest change in projection order) is flagged.
// 2. The contenders are the head, the change it should have replaced (the one before it), and every
//    other change with the same `prev` as the head. Shown oldest first.
// 3. "Conservar este valor" appends a NEW `field.updated` with the chosen value and `prev` = the
//    head's id. That makes it the expected successor, so it is not a conflict and the field's
//    conflict closes. Nothing is deleted: the losing values stay in the history (decision 0002).
// 4. Its `at` is never before the head's, so it stays the head even if a laptop clock ran ahead.
import type { EventEnvelope } from "./events";
import { newEvent, type Actor } from "./factory";
import type { FieldChange, PatientRecord, RecordsModel } from "./projection";

export interface FieldConflict {
  patientId: string;
  field: string;
  /** Latest change; the resolution's `prev` points at it. */
  head: FieldChange;
  /** Competing changes, oldest first, unique by event. */
  contenders: FieldChange[];
}

const FIELD_LABEL: Record<string, string> = {
  "identity.fullName": "Nombre",
  "identity.birthDate": "Fecha de nacimiento",
  "identity.birthState": "Estado de nacimiento",
  "identity.residence": "Domicilio",
  "identity.municipality": "Municipio",
  "identity.phone": "Teléfono",
  "identity.phoneAlt": "Teléfono alterno",
  "identity.email": "Correo",
  "identity.affiliation": "Derechohabiencia",
  "identity.affiliationNumber": "Número de afiliación",
  "identity.hasCartilla": "Cartilla EIRA",
  "history.menarcheAge": "Menarca (edad)",
  "history.menopauseAge": "Menopausia (edad)",
  "history.familyBreastCancer": "Familiares con cáncer de mama",
  "history.hpvVaccinated": "Vacuna VPH",
  "history.hpvDoses": "Dosis de vacuna VPH",
  "history.sexuallyActive": "Vida sexual activa",
  "history.sexualDebutAge": "Inicio de vida sexual (edad)",
};

export const fieldLabel = (field: string) => FIELD_LABEL[field] ?? field;

/** Sensitive history fields: their values follow the same role rule as the history panel. */
export const isSensitiveField = (field: string) =>
  field === "history.sexuallyActive" || field === "history.sexualDebutAge";

/** Value as plain Spanish text. */
export function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "Sin dato";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "Sin dato";
  return String(value);
}

/** Open conflicts of one record, by field name. */
export function conflictsOf(record: PatientRecord): FieldConflict[] {
  const byField = new Map<string, FieldChange[]>();
  for (const c of record.fieldHistory) {
    const list = byField.get(c.field) ?? [];
    list.push(c);
    byField.set(c.field, list);
  }
  const out: FieldConflict[] = [];
  for (const [field, changes] of [...byField].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const head = changes[changes.length - 1];
    if (!head.conflict) continue;
    const before = changes[changes.length - 2];
    const seen = new Set<string>();
    const contenders = changes
      .filter((c) => c === head || c === before || c.prev === head.prev)
      .filter((c) => !seen.has(c.eventId) && seen.add(c.eventId));
    out.push({ patientId: record.patientId, field, head, contenders });
  }
  return out;
}

/** Open conflicts across active records (folio order). */
export function openConflicts(model: RecordsModel): FieldConflict[] {
  return model.activeIds.flatMap((id) => conflictsOf(model.patients[id]));
}

/** `at` for the resolution: now, but strictly after the head even if its clock ran ahead. */
export function resolutionAt(headAt: string, now: Date = new Date()): string {
  let t = Math.max(now.getTime(), (Date.parse(headAt) || 0) + 1);
  let at = new Date(t).toISOString();
  // A local timestamp without offset can still compare as later; push forward until it sorts after.
  for (let i = 0; at <= headAt && i < 48; i++) {
    t += 3_600_000;
    at = new Date(t).toISOString();
  }
  return at;
}

/** Event that keeps `chosen`'s value and closes the conflict (see rule 3). */
export function resolveConflict(
  conflict: FieldConflict,
  chosen: FieldChange,
  actor: Actor,
  opts: { id?: string; now?: Date } = {},
): EventEnvelope<"field.updated"> {
  if (!conflict.contenders.some((c) => c.eventId === chosen.eventId)) {
    throw new Error("El valor elegido no es parte del conflicto.");
  }
  return newEvent(
    "field.updated",
    conflict.patientId,
    { field: conflict.field, value: chosen.value, prev: conflict.head.eventId },
    actor,
    { id: opts.id, at: resolutionAt(conflict.head.at, opts.now) },
  );
}

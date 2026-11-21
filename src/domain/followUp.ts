// ISS-0022: pending follow-up list derived from projected results. Pure.
// The clinical reason is for clinical roles only; non-clinical views show "Requiere seguimiento"
// and the due date (EIRA limit: no findings outside the clinical roles or in notifications).
import type { ServiceType } from "./events";
import type { PatientRecord, RecordsModel, ResultRecord, ServiceRecord } from "./projection";

export type FollowUpCategory =
  | "sospechoso"
  | "imagen_complementaria"
  | "citologia_anormal"
  | "control_6_meses"
  | "repetir_estudio"
  | "mastografia";

export interface FollowUpItem {
  /** Survivor record (aliases resolve to it). */
  patientId: string;
  fullName: string;
  folio: string;
  serviceId: string;
  serviceType: ServiceType;
  /** YYYY-MM-DD of the visit when the study was taken. */
  studyDate: string;
  /** YYYY-MM-DD when the follow-up is due. */
  dueDate: string;
  category: FollowUpCategory;
  /** Spanish clinical reason: show only to clinical roles. */
  reason: string;
  /** 1 = most urgent. */
  priority: 1 | 2 | 3;
  overdue: boolean;
}

export const CATEGORY_LABEL: Record<FollowUpCategory, string> = {
  sospechoso: "Hallazgo sospechoso",
  imagen_complementaria: "Imagen complementaria",
  citologia_anormal: "Citología anormal",
  control_6_meses: "Control a 6 meses",
  repetir_estudio: "Repetir estudio",
  mastografia: "Mastografía pendiente",
};

/** Shown instead of the category to non-clinical roles. */
export const NON_CLINICAL_LABEL = "Requiere seguimiento";

interface Rule {
  category: FollowUpCategory;
  reason: string;
  priority: 1 | 2 | 3;
  months: number;
}

/** "Negativo para lesión intraepitelial o malignidad" / "NILM" count as normal. */
export function isNormalBethesda(text: string): boolean {
  const t = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return /\bnilm\b/.test(t) || t.startsWith("negativo");
}

/** The single most urgent follow-up a result asks for, if any. */
export function ruleFor(result: ResultRecord): Rule | undefined {
  const rules: Rule[] = [];
  const b = result.birads;
  if (b === 4 || b === 5) rules.push({ category: "sospechoso", reason: `BIRADS ${b}: valoración especializada urgente`, priority: 1, months: 0.25 });
  if (result.bethesda && !isNormalBethesda(result.bethesda))
    rules.push({ category: "citologia_anormal", reason: `Citología anormal (${result.bethesda}): valorar colposcopia`, priority: 1, months: 1 });
  if (b === 0 || result.followUp === "imagen_complementaria")
    rules.push({ category: "imagen_complementaria", reason: b === 0 ? "BIRADS 0: requiere imagen complementaria" : "Imagen complementaria indicada", priority: 2, months: 1 });
  if (result.repeatStudy) rules.push({ category: "repetir_estudio", reason: "Repetir el estudio", priority: 2, months: 3 });
  if (b === 3 || result.followUp === "evaluacion_6_meses")
    rules.push({ category: "control_6_meses", reason: b === 3 ? "BIRADS 3: control a 6 meses" : "Evaluación a 6 meses", priority: 3, months: 6 });
  if (result.followUp === "mastografia") rules.push({ category: "mastografia", reason: "Mastografía indicada", priority: 3, months: 3 });
  return rules.sort((x, y) => x.priority - y.priority || x.months - y.months)[0];
}

/** Adds months (fractional = weeks) to a YYYY-MM-DD date, clamping the day to the month's end. */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (months < 1) {
    const dt = new Date(Date.UTC(y, m - 1, d + Math.round(months * 28)));
    return dt.toISOString().slice(0, 10);
  }
  const total = m - 1 + months;
  const ty = y + Math.floor(total / 12);
  const tm = total % 12;
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return `${ty}-${String(tm + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

const studyDateOf = (record: PatientRecord, s: ServiceRecord) =>
  record.visits.find((v) => v.visitId === s.visitId)?.date ?? s.at.slice(0, 10);

/** Pending follow-ups for one record. A later study of the same type closes earlier ones. */
export function followUpsFor(record: PatientRecord, today: string): FollowUpItem[] {
  const services = record.visits.flatMap((v) => v.services);
  const lastStudy: Partial<Record<ServiceType, string>> = {};
  for (const s of services) {
    const d = studyDateOf(record, s);
    if (!lastStudy[s.serviceType] || d > lastStudy[s.serviceType]!) lastStudy[s.serviceType] = d;
  }
  const out: FollowUpItem[] = [];
  for (const s of services) {
    if (!s.result) continue;
    const studyDate = studyDateOf(record, s);
    if (studyDate < lastStudy[s.serviceType]!) continue; // superseded by a newer study
    const rule = ruleFor(s.result);
    if (!rule) continue;
    const dueDate = addMonths(studyDate, rule.months);
    out.push({
      patientId: record.patientId,
      fullName: record.identity.fullName,
      folio: record.folio,
      serviceId: s.serviceId,
      serviceType: s.serviceType,
      studyDate,
      dueDate,
      category: rule.category,
      reason: rule.reason,
      priority: rule.priority,
      overdue: dueDate < today.slice(0, 10),
    });
  }
  return out;
}

/** Every pending follow-up, overdue first, then by due date and priority. `today` is YYYY-MM-DD. */
export function pendingFollowUps(model: RecordsModel, today: string): FollowUpItem[] {
  return model.activeIds
    .flatMap((id) => followUpsFor(model.patients[id], today))
    .sort(
      (a, b) =>
        Number(b.overdue) - Number(a.overdue) ||
        a.dueDate.localeCompare(b.dueDate) ||
        a.priority - b.priority ||
        a.patientId.localeCompare(b.patientId),
    );
}

/** Next suggested visit for a record: earliest pending follow-up, else one year after the last visit. */
export function nextSuggestedVisit(record: PatientRecord, today: string): { date: string; fromFollowUp: boolean } | undefined {
  const pending = followUpsFor(record, today).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  if (pending) return { date: pending.dueDate, fromFollowUp: true };
  const last = record.visits.map((v) => v.date).sort().pop();
  return last ? { date: addMonths(last, 12), fromFollowUp: false } : undefined;
}

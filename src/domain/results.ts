// ISS-0013: role rules for clinical data and the pathologist/doctor result (Bethesda, BIRADS,
// "conducta a seguir"). Pure: the UI builds the payload here and appends `result.recorded`.
import type { EventPayloads, Role, ServiceType, StableHistory } from "./events";

export type ResultPayload = EventPayloads["result.recorded"];
export type FollowUp = NonNullable<ResultPayload["followUp"]>;
export type Birads = NonNullable<ResultPayload["birads"]>;

/** Stable-history keys that only roles allowed by `canSeeSensitive` (session) may see. */
export const SENSITIVE_HISTORY_KEYS: ReadonlyArray<keyof StableHistory> = ["sexuallyActive", "sexualDebutAge"];

/** Clinical service fields and results: hidden from the capturista, who handles identity and contact. */
export const canSeeClinical = (role: Role) => role !== "capturista";

/** Who records results: the pathologist (citología) and the doctor (revisión mamaria, or both). */
export const canRecordResult = (role: Role) => role === "patologo" || role === "medico";

/** Bethesda 2014 categories, as EIRA's pathologist reports them. */
export const BETHESDA: ReadonlyArray<{ value: string; label: string }> = [
  { value: "NILM", label: "Negativo para lesión intraepitelial o malignidad (NILM)" },
  { value: "ASC-US", label: "Células escamosas atípicas de significado indeterminado (ASC-US)" },
  { value: "ASC-H", label: "Células escamosas atípicas, no se descarta lesión de alto grado (ASC-H)" },
  { value: "LSIL", label: "Lesión intraepitelial escamosa de bajo grado (LSIL)" },
  { value: "HSIL", label: "Lesión intraepitelial escamosa de alto grado (HSIL)" },
  { value: "SCC", label: "Carcinoma de células escamosas" },
  { value: "AGC", label: "Células glandulares atípicas (AGC)" },
  { value: "AIS", label: "Adenocarcinoma endocervical in situ (AIS)" },
  { value: "ADENOCARCINOMA", label: "Adenocarcinoma" },
  { value: "INSATISFACTORIA", label: "Muestra insatisfactoria para evaluación" },
];

export const BIRADS: ReadonlyArray<{ value: Birads; label: string }> = [
  { value: 0, label: "BI-RADS 0: estudio incompleto, requiere imagen adicional" },
  { value: 1, label: "BI-RADS 1: negativo" },
  { value: 2, label: "BI-RADS 2: hallazgo benigno" },
  { value: 3, label: "BI-RADS 3: probablemente benigno" },
  { value: 4, label: "BI-RADS 4: sospechoso" },
  { value: 5, label: "BI-RADS 5: altamente sugestivo de malignidad" },
];

/** "Conducta a seguir" from EIRA's breast exam form. */
export const FOLLOW_UP: ReadonlyArray<{ value: FollowUp; label: string }> = [
  { value: "rutina_1_anio", label: "Rutina en 1 año" },
  { value: "mastografia", label: "Mastografía" },
  { value: "imagen_complementaria", label: "Imagen complementaria" },
  { value: "evaluacion_6_meses", label: "Evaluación en 6 meses" },
];

export interface ResultDraft {
  bethesda?: string;
  birads?: Birads;
  followUp?: FollowUp;
  repeatStudy: boolean;
  notes: string;
}

export const emptyResultDraft = (): ResultDraft => ({ repeatStudy: false, notes: "" });

export type ResultField = "bethesda" | "birads" | "followUp";

/** Spanish error per missing field. Citología needs Bethesda; mama needs BIRADS and conducta. */
export function validateResult(type: ServiceType, d: ResultDraft): Partial<Record<ResultField, string>> {
  const errors: Partial<Record<ResultField, string>> = {};
  if (type === "citologia") {
    if (!d.bethesda || !BETHESDA.some((b) => b.value === d.bethesda)) errors.bethesda = "Elige la categoría Bethesda.";
  } else {
    if (d.birads === undefined || !BIRADS.some((b) => b.value === d.birads)) errors.birads = "Elige la categoría BI-RADS.";
    if (!d.followUp) errors.followUp = "Elige la conducta a seguir.";
  }
  return errors;
}

/** Payload for `result.recorded`, keeping only the fields of this service type. Throws if invalid. */
export function buildResultPayload(serviceId: string, type: ServiceType, d: ResultDraft): ResultPayload {
  const errors = validateResult(type, d);
  const first = Object.values(errors)[0];
  if (first) throw new Error(first);
  const payload: ResultPayload = { serviceId, repeatStudy: d.repeatStudy };
  if (type === "citologia") payload.bethesda = d.bethesda;
  else payload.birads = d.birads;
  if (d.followUp) payload.followUp = d.followUp;
  const notes = d.notes.trim();
  if (notes) payload.notes = notes;
  return payload;
}

export const bethesdaLabel = (v?: string) => BETHESDA.find((b) => b.value === v)?.label ?? v ?? "";
export const biradsLabel = (v?: number) => BIRADS.find((b) => b.value === v)?.label ?? "";
export const followUpLabel = (v?: FollowUp) => FOLLOW_UP.find((f) => f.value === v)?.label ?? "";

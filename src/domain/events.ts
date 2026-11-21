// Event contract shared by the UI, the domain, the Rust store and the central server.
// Changing a shape here is a cross-thread change: see docs/specs/sync-protocol.md.

export type Role = "capturista" | "medico" | "patologo" | "admin";

/** Device letter used for provisional folios, e.g. "A" -> "A-0007". */
export type DeviceId = string;

export interface EventEnvelope<T extends EventType = EventType> {
  /** UUID v4, generated on the device. Dedup key everywhere. */
  id: string;
  type: T;
  /** Internal stable patient UUID (never shown in the UI). */
  patientId: string;
  /** Local ISO timestamp when the event was created. */
  at: string;
  device: DeviceId;
  author: string;
  role: Role;
  jornadaId: string;
  payload: EventPayloads[T];
}

export type Affiliation =
  | "INSABI"
  | "IMSS"
  | "ISSSTE"
  | "PEMEX"
  | "SEDENA"
  | "SEMAR"
  | "ninguno"
  | "otro";

export interface Identity {
  fullName: string;
  /** YYYY-MM-DD */
  birthDate: string;
  birthState: string;
  residence: string;
  municipality: string;
  phone?: string;
  phoneAlt?: string;
  email?: string;
  affiliation: Affiliation;
  affiliationNumber?: string;
  hasCartilla: boolean;
}

/** Fields that never change much: confirmed, not re-captured, on later visits. */
export interface StableHistory {
  menarcheAge?: number;
  menopauseAge?: number;
  familyBreastCancer?: string[];
  hpvVaccinated?: boolean;
  hpvDoses?: number;
  sexuallyActive?: boolean;
  sexualDebutAge?: number;
}

export type ServiceType = "citologia" | "mama";

export interface CitologiaFields {
  /** Reactivo 11: computed from history when possible. */
  citologyKind: "primera_vez" | "primera_vez_3_anios" | "subsecuente" | "complementaria_vph";
  gynecoObstetricStatus: string[];
  lastMenstrualPeriod?: string;
  cervixObservation: string[];
  riskFactors: string[];
  repeatedSample: boolean;
  /** Reactivo 22.1: autofilled from the previous citología. */
  previousCytologyNumber?: string;
}

export interface MamaFields {
  consultReason: string;
  previousMammogram: boolean;
  lastMammogramDate?: string;
  lastMammogramResult?: string;
  clinicalExam: string;
  thermography?: "simetrico" | "asimetrico";
  ultrasoundNotes?: string;
}

export interface EventPayloads {
  "patient.created": { identity: Identity; provisionalFolio: string };
  "privacy.accepted": { noticeVersion: string; acceptedOn: string };
  "field.updated": {
    /** Dotted path, e.g. "identity.phone" or "history.menarcheAge". */
    field: string;
    value: unknown;
    /** Id of the event whose value this replaces (conflict detection). */
    prev: string | null;
  };
  "history.confirmed": { history: StableHistory };
  "visit.recorded": {
    visitId: string;
    site: string;
    date: string;
    heightCm?: number;
    weightKg?: number;
    bloodPressure?: string;
    glucose?: number;
    lastMenstrualPeriod?: string;
    reason?: string;
  };
  "service.recorded": {
    serviceId: string;
    visitId: string;
    serviceType: ServiceType;
    fields: CitologiaFields | MamaFields;
    takenByLicense?: string;
    cytologyNumber?: string;
  };
  "result.recorded": {
    serviceId: string;
    bethesda?: string;
    birads?: 0 | 1 | 2 | 3 | 4 | 5;
    followUp?: "rutina_1_anio" | "mastografia" | "imagen_complementaria" | "evaluacion_6_meses";
    repeatStudy?: boolean;
    notes?: string;
  };
  "folio.assigned": { folio: string; provisionalFolio: string };
  "patients.linked": { survivorId: string; aliasId: string; reason: string };
  "patients.marked_distinct": { otherPatientId: string };
}

export type EventType = keyof EventPayloads;

export type AnyEvent = { [K in EventType]: EventEnvelope<K> }[EventType];

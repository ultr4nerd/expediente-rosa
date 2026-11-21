// Pure projection from the event log to the read model the UI renders (decision 0002).
// Deterministic: events are sorted by (at, id); idempotent: repeated ids are ignored.
import type {
  AnyEvent,
  CitologiaFields,
  EventPayloads,
  EventType,
  Identity,
  MamaFields,
  Role,
  ServiceType,
  ViewedSection,
  StableHistory,
} from "./events";
import { isFinalFolio } from "./factory";

/** Who did something and when; copied from the event envelope. */
export interface Provenance {
  eventId: string;
  at: string;
  author: string;
  role: Role;
  device: string;
  jornadaId: string;
}

export interface FieldChange extends Provenance {
  /** Dotted path, e.g. "identity.phone". */
  field: string;
  value: unknown;
  prev: string | null;
  /** True when `prev` is not the change it should replace (concurrent edit, see ISS-0020). */
  conflict: boolean;
}

export interface ResultRecord extends Provenance {
  serviceId: string;
  bethesda?: string;
  birads?: 0 | 1 | 2 | 3 | 4 | 5;
  followUp?: EventPayloads["result.recorded"]["followUp"];
  repeatStudy?: boolean;
  notes?: string;
}

export interface ServiceRecord extends Provenance {
  serviceId: string;
  visitId: string;
  /** Patient whose event recorded it (differs from the record id when it came from a linked alias). */
  patientId: string;
  serviceType: ServiceType;
  fields: CitologiaFields | MamaFields;
  takenByLicense?: string;
  cytologyNumber?: string;
  /** Every result, oldest first. */
  results: ResultRecord[];
  /** Latest result, if any. */
  result?: ResultRecord;
}

export interface VisitRecord extends Provenance {
  visitId: string;
  patientId: string;
  site: string;
  date: string;
  heightCm?: number;
  weightKg?: number;
  bloodPressure?: string;
  glucose?: number;
  lastMenstrualPeriod?: string;
  reason?: string;
  /** Services in (at, id) order. */
  services: ServiceRecord[];
}

export interface TimelineEntry extends Provenance {
  type: EventType;
  patientId: string;
  /** Short Spanish label for the UI (never a diagnosis). */
  label: string;
  visitId?: string;
  serviceId?: string;
  field?: string;
}

export type PatientStatus = "active" | "alias";

export interface PatientRecord {
  patientId: string;
  /** False when events reference this patient but its `patient.created` was not received yet. */
  complete: boolean;
  identity: Identity;
  history: StableHistory;
  /** Every `field.updated`, oldest first. */
  fieldHistory: FieldChange[];
  provisionalFolio: string;
  finalFolio?: string;
  /** Folio to show: final if assigned, else provisional. */
  folio: string;
  /** Every other folio that should find this record (own provisional + folios of linked aliases). */
  folioAliases: string[];
  privacy?: Provenance & { noticeVersion: string; acceptedOn: string };
  /** Set when the record was typed in later from a printed contingency sheet (ISS-0018). */
  intake?: { source: "papel"; paperFolio: string; at: string };
  historyConfirmedAt?: string;
  status: PatientStatus;
  /** For an alias: the survivor record it was linked into (resolved to the root). */
  linkedTo?: string;
  linkReason?: string;
  /** For a survivor: patient ids linked into it. */
  aliasIds: string[];
  /** Patients confirmed by a human as different people. */
  distinctFrom: string[];
  createdAt?: string;
  created?: Provenance;
  updatedAt: string;
  /** Visits (including those of linked aliases for a survivor), oldest first. */
  visits: VisitRecord[];
  /** Every event of this record (and its aliases), oldest first. */
  timeline: TimelineEntry[];
  /** Audit of sensitive-data views (`record.viewed`), oldest first. Kept out of `timeline`; the UI shows it to admin only. */
  accessLog: AccessEntry[];
}

export interface AccessEntry extends Provenance {
  section: ViewedSection;
  serviceId?: string;
}

export interface RecordsModel {
  /** Every patient record by id, aliases included. */
  patients: Record<string, PatientRecord>;
  /** Active (non-alias) patient ids sorted by folio. */
  activeIds: string[];
  /** Any folio (provisional, final or alias) -> survivor patient id. */
  folioIndex: Record<string, string>;
  /** Pairs marked distinct, each sorted [a, b], unique, sorted. */
  distinctPairs: Array<[string, string]>;
  /** Unique events in projection order. */
  events: AnyEvent[];
}

/** `field.updated` path that marks a record as typed in from a paper contingency sheet. */
export const PAPER_FOLIO_FIELD = "intake.paperFolio";

const LABELS: Record<EventType, string> = {
  "patient.created": "Alta de paciente",
  "privacy.accepted": "Aviso de privacidad aceptado",
  "field.updated": "Dato actualizado",
  "history.confirmed": "Antecedentes confirmados",
  "visit.recorded": "Visita registrada",
  "service.recorded": "Servicio registrado",
  "result.recorded": "Resultado registrado",
  "folio.assigned": "Folio definitivo asignado",
  "patients.linked": "Expedientes vinculados",
  "patients.marked_distinct": "Marcadas como personas distintas",
  "record.viewed": "Consulta de datos sensibles",
};

const SERVICE_LABEL: Record<ServiceType, string> = {
  citologia: "Citología",
  mama: "Revisión mamaria",
};

const FIELD_LABEL: Record<string, string> = {
  "identity.fullName": "nombre",
  "identity.birthDate": "fecha de nacimiento",
  "identity.birthState": "entidad de nacimiento",
  "identity.residence": "residencia habitual",
  "identity.municipality": "municipio",
  "identity.phone": "teléfono",
  "identity.phoneAlt": "otro teléfono",
  "identity.email": "correo",
  "identity.affiliation": "afiliación",
  "identity.affiliationNumber": "número de afiliación",
  "identity.hasCartilla": "Cartilla EIRA",
};

/** Sort by (at, id) and drop repeated ids (first occurrence in sorted order wins). */
export function orderEvents(events: readonly AnyEvent[]): AnyEvent[] {
  const sorted = [...events].sort(compareEvents);
  const seen = new Set<string>();
  const out: AnyEvent[] = [];
  for (const e of sorted) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
  }
  return out;
}

export function compareEvents(a: AnyEvent, b: AnyEvent): number {
  if (a.at !== b.at) return a.at < b.at ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

const provenance = (e: AnyEvent): Provenance => ({
  eventId: e.id,
  at: e.at,
  author: e.author,
  role: e.role,
  device: e.device,
  jornadaId: e.jornadaId,
});

const emptyIdentity = (): Identity => ({
  fullName: "",
  birthDate: "",
  birthState: "",
  residence: "",
  municipality: "",
  affiliation: "ninguno",
  hasCartilla: false,
});

function newPatient(patientId: string, at: string): PatientRecord {
  return {
    patientId,
    complete: false,
    identity: emptyIdentity(),
    history: {},
    fieldHistory: [],
    provisionalFolio: "",
    folio: "",
    folioAliases: [],
    status: "active",
    aliasIds: [],
    distinctFrom: [],
    updatedAt: at,
    visits: [],
    timeline: [],
    accessLog: [],
  };
}

function labelFor(e: AnyEvent, services: Map<string, ServiceRecord>): string {
  switch (e.type) {
    case "field.updated": {
      if (e.payload.field === PAPER_FOLIO_FIELD) return `Capturada desde hoja de papel ${String(e.payload.value)}`;
      const name = FIELD_LABEL[e.payload.field];
      if (name) return `Cambio de ${name}`;
      return e.payload.field.startsWith("history.") ? "Antecedente actualizado" : LABELS[e.type];
    }
    case "service.recorded":
      return SERVICE_LABEL[e.payload.serviceType];
    case "result.recorded": {
      const s = services.get(e.payload.serviceId);
      return s ? `Resultado de ${SERVICE_LABEL[s.serviceType].toLowerCase()}` : LABELS[e.type];
    }
    case "folio.assigned":
      return `Folio definitivo ${e.payload.folio}`;
    default:
      return LABELS[e.type];
  }
}

function setPath(target: Record<string, unknown>, key: string, value: unknown) {
  if (value === undefined || value === null) delete target[key];
  else target[key] = value;
}

/** Projects the event log into the read model. Pure and deterministic. */
export function project(input: readonly AnyEvent[]): RecordsModel {
  const events = orderEvents(input);
  const patients = new Map<string, PatientRecord>();
  const visits = new Map<string, VisitRecord>();
  const services = new Map<string, ServiceRecord>();
  const pendingResults: ResultRecord[] = [];
  const lastFieldEvent = new Map<string, string>(); // `${patientId}|${field}` -> event id
  const links: Array<{ survivorId: string; aliasId: string; reason: string }> = [];
  const distinct = new Map<string, [string, string]>();

  const get = (id: string, at: string) => {
    let p = patients.get(id);
    if (!p) {
      p = newPatient(id, at);
      patients.set(id, p);
    }
    return p;
  };

  // Pass 1: creations first, so a clock-skewed update never precedes its patient.
  for (const e of events) {
    if (e.type !== "patient.created") continue;
    const p = get(e.patientId, e.at);
    if (p.complete) continue; // a second creation for the same id is ignored
    p.complete = true;
    p.identity = { ...e.payload.identity };
    p.provisionalFolio = e.payload.provisionalFolio;
    p.created = provenance(e);
    p.createdAt = e.at;
  }

  // Pass 2: everything in (at, id) order.
  for (const e of events) {
    const p = get(e.patientId, e.at);
    // A view is an audit entry, not a change to the record.
    if (e.type === "record.viewed") {
      p.accessLog.push({ ...provenance(e), section: e.payload.section, serviceId: e.payload.serviceId });
      continue;
    }
    if (e.at > p.updatedAt) p.updatedAt = e.at;
    const prov = provenance(e);

    switch (e.type) {
      case "patient.created":
        break;
      case "privacy.accepted":
        p.privacy = { ...prov, ...e.payload };
        break;
      case "field.updated": {
        const { field, value, prev } = e.payload;
        const key = `${e.patientId}|${field}`;
        const expected = lastFieldEvent.get(key);
        const conflict = expected === undefined ? prev !== null && prev !== p.created?.eventId : prev !== expected;
        p.fieldHistory.push({ ...prov, field, value, prev, conflict });
        lastFieldEvent.set(key, e.id);
        if (field === PAPER_FOLIO_FIELD && typeof value === "string" && value) {
          p.intake = { source: "papel", paperFolio: value, at: e.at };
        }
        const [root, ...rest] = field.split(".");
        const leaf = rest.join(".");
        if (root === "identity" && leaf) setPath(p.identity as unknown as Record<string, unknown>, leaf, value);
        else if (root === "history" && leaf) setPath(p.history as Record<string, unknown>, leaf, value);
        break;
      }
      case "history.confirmed":
        p.history = { ...p.history, ...e.payload.history };
        p.historyConfirmedAt = e.at;
        break;
      case "visit.recorded": {
        if (visits.has(e.payload.visitId)) break;
        visits.set(e.payload.visitId, { ...prov, ...e.payload, patientId: e.patientId, services: [] });
        break;
      }
      case "service.recorded": {
        if (services.has(e.payload.serviceId)) break;
        services.set(e.payload.serviceId, { ...prov, ...e.payload, patientId: e.patientId, results: [] });
        break;
      }
      case "result.recorded":
        pendingResults.push({ ...prov, ...e.payload });
        break;
      case "folio.assigned": {
        if (p.finalFolio && p.finalFolio !== e.payload.folio) p.folioAliases.push(p.finalFolio);
        p.finalFolio = e.payload.folio;
        break;
      }
      case "patients.linked":
        links.push(e.payload);
        break;
      case "patients.marked_distinct": {
        const pair = [e.patientId, e.payload.otherPatientId].sort() as [string, string];
        if (pair[0] !== pair[1]) distinct.set(pair.join("|"), pair);
        break;
      }
    }
  }

  // Attach results to services, services to visits, visits to patients.
  for (const r of pendingResults) {
    const s = services.get(r.serviceId);
    if (!s) continue;
    s.results.push(r);
    s.result = r;
  }
  for (const s of services.values()) visits.get(s.visitId)?.services.push(s);
  for (const v of visits.values()) get(v.patientId, v.at).visits.push(v);

  // Own timelines (views are audit, not clinical history: see accessLog).
  for (const e of events) {
    if (e.type === "record.viewed") continue;
    const entry: TimelineEntry = { ...provenance(e), type: e.type, patientId: e.patientId, label: labelFor(e, services) };
    if (e.type === "visit.recorded") entry.visitId = e.payload.visitId;
    if (e.type === "service.recorded") {
      entry.visitId = e.payload.visitId;
      entry.serviceId = e.payload.serviceId;
    }
    if (e.type === "result.recorded") {
      entry.serviceId = e.payload.serviceId;
      entry.visitId = services.get(e.payload.serviceId)?.visitId;
    }
    if (e.type === "field.updated") entry.field = e.payload.field;
    patients.get(e.patientId)!.timeline.push(entry);
    // Linking and distinct marks also show on the other record.
    if (e.type === "patients.linked" || e.type === "patients.marked_distinct") {
      const other = e.type === "patients.linked"
        ? (e.payload.survivorId === e.patientId ? e.payload.aliasId : e.payload.survivorId)
        : e.payload.otherPatientId;
      if (other !== e.patientId) get(other, e.at).timeline.push(entry);
    }
  }

  // Current folio and own aliases.
  for (const p of patients.values()) {
    p.folio = p.finalFolio ?? p.provisionalFolio;
    if (p.finalFolio && p.provisionalFolio) p.folioAliases.push(p.provisionalFolio);
    if (p.intake) p.folioAliases.push(p.intake.paperFolio);
  }

  // Distinct marks.
  const distinctPairs = [...distinct.values()].sort((a, b) => (a.join("|") < b.join("|") ? -1 : 1));
  for (const [a, b] of distinctPairs) {
    get(a, "").distinctFrom.push(b);
    get(b, "").distinctFrom.push(a);
  }

  // Links: alias -> survivor, resolved to the root; cycles and self-links are ignored.
  const parent = new Map<string, string>();
  for (const l of links) {
    if (l.aliasId === l.survivorId || parent.has(l.aliasId)) continue;
    let root = l.survivorId;
    const seen = new Set([l.aliasId]);
    while (parent.has(root) && !seen.has(root)) {
      seen.add(root);
      root = parent.get(root)!;
    }
    if (root === l.aliasId) continue; // would create a cycle
    parent.set(l.aliasId, l.survivorId);
    const alias = get(l.aliasId, "");
    alias.linkReason = l.reason;
  }
  const resolve = (id: string) => {
    let cur = id;
    const seen = new Set<string>();
    while (parent.has(cur) && !seen.has(cur)) {
      seen.add(cur);
      cur = parent.get(cur)!;
    }
    return cur;
  };
  const aliasIdsSorted = [...parent.keys()].sort();
  for (const aliasId of aliasIdsSorted) {
    const alias = patients.get(aliasId)!;
    const rootId = resolve(aliasId);
    const root = get(rootId, "");
    alias.status = "alias";
    alias.linkedTo = rootId;
    root.aliasIds.push(aliasId);
    root.folioAliases.push(...[alias.provisionalFolio, alias.finalFolio, ...alias.folioAliases].filter(Boolean) as string[]);
  }
  for (const aliasId of aliasIdsSorted) {
    const alias = patients.get(aliasId)!;
    const root = patients.get(alias.linkedTo!)!;
    root.visits.push(...alias.visits);
    const ids = new Set(root.timeline.map((t) => t.eventId));
    root.timeline.push(...alias.timeline.filter((t) => !ids.has(t.eventId)));
    root.accessLog.push(...alias.accessLog);
    for (const d of alias.distinctFrom) if (!root.distinctFrom.includes(d)) root.distinctFrom.push(d);
    if (alias.updatedAt > root.updatedAt) root.updatedAt = alias.updatedAt;
  }

  // Final sorting so output never depends on Map insertion order.
  const byProv = (a: Provenance, b: Provenance) => (a.at !== b.at ? (a.at < b.at ? -1 : 1) : a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0);
  for (const p of patients.values()) {
    p.visits.sort(byProv);
    for (const v of p.visits) v.services.sort(byProv);
    p.timeline.sort(byProv);
    p.accessLog.sort(byProv);
    p.folioAliases = [...new Set(p.folioAliases)].filter((f) => f && f !== p.folio).sort();
    p.aliasIds.sort();
    p.distinctFrom = [...new Set(p.distinctFrom)].sort();
  }

  const sortedIds = [...patients.keys()].sort();
  const out: Record<string, PatientRecord> = {};
  for (const id of sortedIds) out[id] = patients.get(id)!;

  const folioIndex: Record<string, string> = {};
  for (const id of sortedIds) {
    const p = out[id];
    const target = p.status === "alias" ? p.linkedTo! : id;
    for (const f of [p.provisionalFolio, p.finalFolio, ...p.folioAliases]) if (f && !(f in folioIndex)) folioIndex[f] = target;
  }

  const activeIds = sortedIds
    .filter((id) => out[id].status === "active" && out[id].complete)
    .sort((a, b) => compareFolio(out[a].folio, out[b].folio) || (a < b ? -1 : 1));

  return { patients: out, activeIds, folioIndex, distinctPairs, events };
}

/** Final folios first (by year/number), then provisional ones. */
function compareFolio(a: string, b: string): number {
  const fa = isFinalFolio(a);
  const fb = isFinalFolio(b);
  if (fa !== fb) return fa ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Survivor record for any id (an alias resolves to the record it was linked into). */
export function resolvePatient(model: RecordsModel, patientId: string): PatientRecord | undefined {
  const p = model.patients[patientId];
  if (!p) return undefined;
  return p.status === "alias" && p.linkedTo ? model.patients[p.linkedTo] : p;
}

/** Finds a record by any folio, provisional or final, including aliases. Case and spaces are ignored. */
export function findByFolio(model: RecordsModel, folio: string): PatientRecord | undefined {
  const q = folio.trim().toUpperCase();
  const id = model.folioIndex[q] ?? model.folioIndex[folio.trim()];
  return id ? model.patients[id] : undefined;
}

/** True when a human marked the two records as different people. */
export function areMarkedDistinct(model: RecordsModel, a: string, b: string): boolean {
  return model.patients[a]?.distinctFrom.includes(b) ?? false;
}

/** All services of a type for a patient (survivor view), oldest first. */
export function servicesOf(record: PatientRecord, type?: ServiceType): ServiceRecord[] {
  return record.visits.flatMap((v) => v.services).filter((s) => !type || s.serviceType === type);
}

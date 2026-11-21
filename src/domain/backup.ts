// JSON backup of the whole event log (ISS-0017). Restoring appends: the store ignores ids it already has,
// so a backup can be restored any number of times, on any device, without duplicating records.
import type { AnyEvent, EventType } from "./events";

export const BACKUP_FORMAT = "expediente-rosa-respaldo";
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  device: string;
  exportedAt: string;
  count: number;
  events: AnyEvent[];
}

const EVENT_TYPES: EventType[] = [
  "patient.created", "privacy.accepted", "field.updated", "history.confirmed", "visit.recorded",
  "service.recorded", "result.recorded", "folio.assigned", "patients.linked", "patients.marked_distinct",
];

export function createBackup(events: AnyEvent[], device: string, now: Date = new Date()): BackupFile {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, device, exportedAt: now.toISOString(), count: events.length, events };
}

/** "expediente-rosa-respaldo-A-2026-11-21-1830.json" (local time). */
export function backupFileName(device: string, now: Date = new Date(), ext = "json", kind = "respaldo"): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
  const dev = device.replace(/[^A-Za-z0-9]/g, "") || "X";
  return `expediente-rosa-${kind}-${dev}-${date}.${ext}`;
}

function isEvent(e: unknown): e is AnyEvent {
  if (!e || typeof e !== "object") return false;
  const o = e as Record<string, unknown>;
  return (
    typeof o.id === "string" && o.id.length > 0 &&
    typeof o.type === "string" && (EVENT_TYPES as string[]).includes(o.type) &&
    typeof o.patientId === "string" &&
    typeof o.at === "string" &&
    typeof o.device === "string" &&
    !!o.payload && typeof o.payload === "object"
  );
}

export type ParsedBackup =
  | { ok: true; events: AnyEvent[]; skipped: number; device?: string; exportedAt?: string }
  | { ok: false; error: string };

/** Parses a backup file (or a bare event array). Invalid entries are skipped and counted. */
export function parseBackup(text: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "El archivo no es un respaldo válido (no es JSON)." };
  }
  const obj = data as Partial<BackupFile> | null;
  const list = Array.isArray(data) ? data : obj && obj.format === BACKUP_FORMAT && Array.isArray(obj.events) ? obj.events : null;
  if (!list) return { ok: false, error: "El archivo no es un respaldo de Expediente Rosa." };
  if (!Array.isArray(data) && (obj?.version ?? 0) > BACKUP_VERSION) {
    return { ok: false, error: "El respaldo es de una versión más nueva de la app. Actualízala primero." };
  }
  const events = list.filter(isEvent);
  return {
    ok: true,
    events,
    skipped: list.length - events.length,
    device: Array.isArray(data) ? undefined : obj?.device,
    exportedAt: Array.isArray(data) ? undefined : obj?.exportedAt,
  };
}

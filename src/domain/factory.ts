// Event construction helpers shared by every thread. Pure except for id/time defaults.
import type { AnyEvent, EventEnvelope, EventPayloads, EventType, Role } from "./events";

export interface Actor {
  device: string;
  author: string;
  role: Role;
  jornadaId: string;
}

export function newEvent<T extends EventType>(
  type: T,
  patientId: string,
  payload: EventPayloads[T],
  actor: Actor,
  opts: { id?: string; at?: string } = {},
): EventEnvelope<T> {
  return {
    id: opts.id ?? crypto.randomUUID(),
    type,
    patientId,
    at: opts.at ?? new Date().toISOString(),
    device: actor.device,
    author: actor.author,
    role: actor.role,
    jornadaId: actor.jornadaId,
    payload,
  };
}

/** Next provisional folio for this device: "<device>-<NNNN>", counting its own patient.created events. */
export function nextProvisionalFolio(events: AnyEvent[], device: string): string {
  const created = events.filter((e) => e.type === "patient.created" && e.device === device).length;
  return `${device}-${String(created + 1).padStart(4, "0")}`;
}

/** Final folios look like "2026-0143"; provisional ones like "A-0007". */
export const isFinalFolio = (folio: string) => /^\d{4}-\d{4,}$/.test(folio);

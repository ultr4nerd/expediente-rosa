// ISS-0023: access log for sensitive data. Revealing sensitive data appends `record.viewed`
// (who/role/device/when come from the envelope; the payload never carries the data itself).
import type { EventEnvelope, Role, ViewedSection } from "./events";
import { newEvent, type Actor } from "./factory";

export const SECTION_LABEL: Record<ViewedSection, string> = {
  sensitive_history: "Antecedentes gineco-obstétricos sensibles",
  clinical_service: "Datos clínicos del servicio",
  result: "Resultado",
};

/** Only admin sees the access log. */
export const canSeeAccessLog = (role: Role) => role === "admin";

/**
 * One reveal = one event per section (and service) per screen visit: create one per mount and
 * ask it before appending. Hiding and showing again in the same visit is not logged twice.
 */
export function createViewOnce() {
  const seen = new Set<string>();
  return (section: ViewedSection, serviceId?: string): boolean => {
    const key = `${section}|${serviceId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
}

export function recordViewed(
  patientId: string,
  section: ViewedSection,
  actor: Actor,
  serviceId?: string,
  opts: { id?: string; at?: string } = {},
): EventEnvelope<"record.viewed"> {
  return newEvent("record.viewed", patientId, serviceId ? { section, serviceId } : { section }, actor, opts);
}

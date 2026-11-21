import { describe, expect, it } from "vitest";
import { newEvent, type Actor } from "@/domain/factory";
import type { Identity } from "@/domain/events";
import { findCandidates, matchablePatients } from "./MatchStub";

const actor: Actor = { device: "A", author: "u", role: "capturista", jornadaId: "j" };
const id = (fullName: string, extra: Partial<Identity> = {}): Identity => ({
  fullName, birthDate: "1985-03-15", birthState: "Puebla", residence: "Centro", municipality: "Zapotitlán",
  affiliation: "ninguno", hasCartilla: false, ...extra,
});
const events = [
  newEvent("patient.created", "p1", { identity: id("María Ejemplo Ruiz", { phone: "2221234567" }), provisionalFolio: "A-0001" }, actor),
  newEvent("patient.created", "p2", { identity: id("María Ejemplar Soto"), provisionalFolio: "A-0002" }, actor),
  newEvent("patient.created", "p3", { identity: id("Juana Pérez"), provisionalFolio: "A-0003" }, actor),
];
const patients = matchablePatients(events);

describe("findCandidates (stub)", () => {
  it("a typo finds both similar names with different reasons", () => {
    const c = findCandidates("Maria Ejenplo", patients);
    expect(c.map((x) => x.patientId)).toEqual(["p1", "p2"]);
    expect(c[0].reasons[0].label).not.toEqual(c[1].reasons[0].label);
  });
  it("finds by folio without leading zeros and by phone", () => {
    expect(findCandidates("a-3", patients)[0].reasons[0].kind).toBe("folio");
    expect(findCandidates("4567", patients)[0].patientId).toBe("p1");
    expect(findCandidates("222 123 4567", patients)[0].reasons[0].label).toBe("Teléfono igual");
  });
  it("handles abbreviations, accents and surname order", () => {
    expect(findCandidates("ruiz ma. ejemplo", patients)[0].reasons[0].label).toBe("Mismos nombres, en otro orden");
  });
  it("tracks distinct pairs from events", () => {
    const more = [...events, newEvent("patients.marked_distinct", "p1", { otherPatientId: "p2" }, actor)];
    expect(matchablePatients(more).find((p) => p.patientId === "p2")?.distinctFrom).toEqual(["p1"]);
  });
});

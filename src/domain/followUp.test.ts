import { describe, expect, it } from "vitest";
import type { AnyEvent } from "./events";
import { newEvent } from "./factory";
import { project } from "./projection";
import { seedEvents } from "./seed";
import { addMonths, isNormalBethesda, nextSuggestedVisit, pendingFollowUps, ruleFor } from "./followUp";

const actor = { device: "A", author: "u", role: "medico" as const, jornadaId: "j" };
const at = (d: string) => `${d}T15:00:00.000Z`;
const identity = { fullName: "Ana", birthDate: "1970-01-01", birthState: "Jalisco", residence: "", municipality: "", affiliation: "ninguno" as const, hasCartilla: false };
const mamaFields = { consultReason: "", previousMammogram: false, clinicalExam: "" };

function patient(id: string, folio: string): AnyEvent[] {
  return [newEvent("patient.created", id, { identity: { ...identity, fullName: id }, provisionalFolio: folio }, actor, { id: `${id}-c`, at: at("2026-01-01") })];
}
function mama(id: string, n: string, date: string, result: { birads?: 0 | 1 | 2 | 3 | 4 | 5; followUp?: "evaluacion_6_meses" | "mastografia" | "imagen_complementaria" | "rutina_1_anio" }): AnyEvent[] {
  return [
    newEvent("visit.recorded", id, { visitId: `${id}-v${n}`, site: "x", date }, actor, { id: `${id}-v${n}`, at: at(date) }),
    newEvent("service.recorded", id, { serviceId: `${id}-s${n}`, visitId: `${id}-v${n}`, serviceType: "mama", fields: mamaFields }, actor, { id: `${id}-s${n}`, at: at(date) }),
    newEvent("result.recorded", id, { serviceId: `${id}-s${n}`, ...result }, actor, { id: `${id}-r${n}`, at: at(date) }),
  ];
}

describe("follow-up rules", () => {
  it("maps results to categories, keeping the most urgent", () => {
    const r = (x: object) => ruleFor({ serviceId: "s", eventId: "e", at: "", author: "", role: "medico", device: "", jornadaId: "", ...x });
    expect(r({ birads: 3 })?.category).toBe("control_6_meses");
    expect(r({ followUp: "evaluacion_6_meses" })?.months).toBe(6);
    expect(r({ birads: 0 })?.category).toBe("imagen_complementaria");
    expect(r({ birads: 4 })?.category).toBe("sospechoso");
    expect(r({ birads: 5, followUp: "evaluacion_6_meses" })?.category).toBe("sospechoso");
    expect(r({ followUp: "mastografia" })?.category).toBe("mastografia");
    expect(r({ repeatStudy: true })?.category).toBe("repetir_estudio");
    expect(r({ bethesda: "LSIL" })?.category).toBe("citologia_anormal");
    expect(r({ bethesda: "Negativo para lesión intraepitelial o malignidad", followUp: "rutina_1_anio" })).toBeUndefined();
    expect(r({ birads: 1, followUp: "rutina_1_anio" })).toBeUndefined();
    expect(isNormalBethesda("NILM")).toBe(true);
  });

  it("adds months clamping the day", () => {
    expect(addMonths("2026-03-21", 6)).toBe("2026-09-21");
    expect(addMonths("2026-08-31", 6)).toBe("2027-02-28");
    expect(addMonths("2026-03-21", 0.25)).toBe("2026-03-28");
  });
});

describe("pendingFollowUps", () => {
  it("BIRADS 3 is due 6 months after the study; overdue first; newer study closes it", () => {
    const events = [
      ...patient("p1", "A-0001"), ...mama("p1", "1", "2026-03-21", { birads: 3, followUp: "evaluacion_6_meses" }),
      ...patient("p2", "A-0002"), ...mama("p2", "1", "2026-11-01", { birads: 0 }),
      ...patient("p3", "A-0003"), ...mama("p3", "1", "2026-01-10", { birads: 3 }), ...mama("p3", "2", "2026-07-10", { birads: 1, followUp: "rutina_1_anio" }),
    ];
    const items = pendingFollowUps(project(events), "2026-11-21");
    expect(items.map((i) => [i.patientId, i.category, i.dueDate, i.overdue])).toEqual([
      ["p1", "control_6_meses", "2026-09-21", true],
      ["p2", "imagen_complementaria", "2026-12-01", false],
    ]);
  });

  it("lists aliases under the survivor", () => {
    const events = [
      ...patient("p1", "2026-0001"), ...patient("p2", "B-0001"), ...mama("p2", "1", "2026-03-21", { birads: 4 }),
      newEvent("patients.linked", "p1", { survivorId: "p1", aliasId: "p2", reason: "x" }, actor, { id: "l", at: at("2026-04-01") }),
    ];
    const items = pendingFollowUps(project(events), "2026-11-21");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ patientId: "p1", folio: "2026-0001", category: "sospechoso" });
  });

  it("the seed has 2-3 patients to follow up", () => {
    const items = pendingFollowUps(project(seedEvents()), "2026-11-21");
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.length).toBeLessThanOrEqual(4);
    expect(new Set(items.map((i) => i.category)).size).toBeGreaterThanOrEqual(2);
  });

  it("suggests the next visit from follow-up or one year after the last visit", () => {
    const m = project([...patient("p1", "A-0001"), ...mama("p1", "1", "2026-03-21", { birads: 3 }), ...patient("p2", "A-0002"), ...mama("p2", "1", "2026-03-21", { birads: 1 })]);
    expect(nextSuggestedVisit(m.patients.p1, "2026-11-21")).toEqual({ date: "2026-09-21", fromFollowUp: true });
    expect(nextSuggestedVisit(m.patients.p2, "2026-11-21")).toEqual({ date: "2027-03-21", fromFollowUp: false });
  });
});

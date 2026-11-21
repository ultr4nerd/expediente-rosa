import { describe, expect, it } from "vitest";
import type { AnyEvent, Identity } from "./events";
import { newEvent } from "./factory";
import { project } from "./projection";
import { canSeeAccessLog, createViewOnce, recordViewed } from "./access";

const identity: Identity = {
  fullName: "Rosa Prueba", birthDate: "1970-01-01", birthState: "Jalisco", residence: "Calle 1",
  municipality: "Tuxpan", affiliation: "ninguno", hasCartilla: false,
};
const capturista = { device: "A", author: "u-laura", role: "capturista" as const, jornadaId: "j" };
const medico = { device: "B", author: "u-ana", role: "medico" as const, jornadaId: "j" };

describe("access log (record.viewed)", () => {
  const created = newEvent("patient.created", "p1", { identity, provisionalFolio: "A-0001" }, capturista, { id: "e0", at: "2026-11-21T09:00:00" });

  it("builds an audit event with who, role, device and section, without the data", () => {
    const e = recordViewed("p1", "sensitive_history", medico, undefined, { at: "2026-11-21T10:00:00" });
    expect(e).toMatchObject({ type: "record.viewed", patientId: "p1", author: "u-ana", role: "medico", device: "B" });
    expect(e.payload).toEqual({ section: "sensitive_history" });
    expect(recordViewed("p1", "result", medico, "s1").payload).toEqual({ section: "result", serviceId: "s1" });
  });

  it("debounces: one event per section and service per screen visit", () => {
    const once = createViewOnce();
    expect(once("sensitive_history")).toBe(true);
    expect(once("sensitive_history")).toBe(false);
    expect(once("result", "s1")).toBe(true);
    expect(once("result", "s2")).toBe(true);
    expect(once("result", "s1")).toBe(false);
    expect(createViewOnce()("sensitive_history")).toBe(true); // new visit
  });

  it("projects views into accessLog, not the timeline, and does not touch updatedAt", () => {
    const view = recordViewed("p1", "sensitive_history", medico, undefined, { id: "v1", at: "2026-11-21T12:00:00" });
    const events: AnyEvent[] = [created, view];
    const p = project(events).patients.p1;
    expect(p.timeline.map((t) => t.type)).toEqual(["patient.created"]);
    expect(p.updatedAt).toBe("2026-11-21T09:00:00");
    expect(p.accessLog).toEqual([
      { eventId: "v1", at: "2026-11-21T12:00:00", author: "u-ana", role: "medico", device: "B", jornadaId: "j", section: "sensitive_history", serviceId: undefined },
    ]);
  });

  it("a linked alias's views move to the survivor's access log", () => {
    const other = newEvent("patient.created", "p2", { identity, provisionalFolio: "B-0001" }, capturista, { id: "e1", at: "2026-11-21T09:30:00" });
    const view = recordViewed("p2", "result", medico, "s9", { id: "v2", at: "2026-11-21T11:00:00" });
    const link = newEvent("patients.linked", "p1", { survivorId: "p1", aliasId: "p2", reason: "misma" }, medico, { at: "2026-11-21T13:00:00" });
    const model = project([created, other, view, link]);
    expect(model.patients.p1.accessLog.map((a) => a.eventId)).toEqual(["v2"]);
  });

  it("only admin sees the log", () => {
    expect(canSeeAccessLog("admin")).toBe(true);
    for (const r of ["capturista", "medico", "patologo"] as const) expect(canSeeAccessLog(r)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import type { AnyEvent, CitologiaFields, Identity } from "./events";
import { newEvent, type Actor } from "./factory";
import { MemoryEventStore } from "@/platform/memory";
import { createRecordsSource } from "@/app/useRecords";
import { areMarkedDistinct, findByFolio, project, resolvePatient, servicesOf } from "./projection";

const A: Actor = { device: "A", author: "u-laura", role: "capturista", jornadaId: "j1" };
const B: Actor = { ...A, device: "B" };
const doc: Actor = { ...A, author: "u-ana", role: "medico" };
const path: Actor = { ...A, author: "u-jorge", role: "patologo" };

const identity = (fullName: string, birthDate = "1985-03-14"): Identity => ({
  fullName,
  birthDate,
  birthState: "Jalisco",
  residence: "Calle Hidalgo 12",
  municipality: "Zapotlán el Grande",
  phone: "3411234567",
  affiliation: "ninguno",
  hasCartilla: true,
});

const cito: CitologiaFields = {
  citologyKind: "primera_vez",
  gynecoObstetricStatus: [],
  cervixObservation: [],
  riskFactors: [],
  repeatedSample: false,
};

const at = (d: string) => `2026-${d}T10:00:00.000Z`;

function mariaLog(): AnyEvent[] {
  return [
    newEvent("patient.created", "p1", { identity: identity("María Ejemplo"), provisionalFolio: "A-0001" }, A, { id: "c1", at: at("02-10") }),
    newEvent("privacy.accepted", "p1", { noticeVersion: "v1", acceptedOn: "2026-02-10" }, A, { id: "pa1", at: at("02-10") }),
    newEvent("visit.recorded", "p1", { visitId: "v1", site: "Zapotitlán", date: "2026-02-10" }, A, { id: "vr1", at: at("02-10") }),
    newEvent("service.recorded", "p1", { serviceId: "s1", visitId: "v1", serviceType: "citologia", fields: cito, cytologyNumber: "C-2026-0042" }, doc, { id: "sr1", at: at("02-11") }),
    newEvent("result.recorded", "p1", { serviceId: "s1", bethesda: "NILM", followUp: "rutina_1_anio" }, path, { id: "rr1", at: at("03-01") }),
    newEvent("field.updated", "p1", { field: "identity.phone", value: "3419998877", prev: "c1" }, A, { id: "fu1", at: at("05-02") }),
    newEvent("folio.assigned", "p1", { folio: "2026-0143", provisionalFolio: "A-0001" }, A, { id: "fa1", at: at("05-03") }),
  ];
}

describe("project", () => {
  it("builds identity, folio, privacy, visits, services and results", () => {
    const m = project(mariaLog());
    const p = m.patients.p1;
    expect(p.complete).toBe(true);
    expect(p.identity.phone).toBe("3419998877");
    expect(p.fieldHistory).toHaveLength(1);
    expect(p.fieldHistory[0]).toMatchObject({ field: "identity.phone", prev: "c1", conflict: false });
    expect(p.folio).toBe("2026-0143");
    expect(p.provisionalFolio).toBe("A-0001");
    expect(p.folioAliases).toEqual(["A-0001"]);
    expect(p.privacy?.noticeVersion).toBe("v1");
    expect(p.visits).toHaveLength(1);
    expect(p.visits[0].services[0].cytologyNumber).toBe("C-2026-0042");
    expect(p.visits[0].services[0].result?.bethesda).toBe("NILM");
    expect(servicesOf(p, "citologia")).toHaveLength(1);
    expect(servicesOf(p, "mama")).toHaveLength(0);
    expect(p.timeline.map((t) => t.label)).toEqual([
      "Alta de paciente",
      "Aviso de privacidad aceptado",
      "Visita registrada",
      "Citología",
      "Resultado de citología",
      "Cambio de teléfono",
      "Folio definitivo 2026-0143",
    ]);
    expect(m.activeIds).toEqual(["p1"]);
  });

  it("is deterministic regardless of input order and idempotent against duplicates", () => {
    const log = mariaLog();
    const shuffled = [...log].reverse();
    const doubled = [...log, ...log.map((e) => ({ ...e }))];
    const base = JSON.stringify(project(log));
    expect(JSON.stringify(project(shuffled))).toBe(base);
    expect(JSON.stringify(project(doubled))).toBe(base);
    expect(project(doubled).events).toHaveLength(log.length);
  });

  it("orders by (at, id) and keeps the last field value", () => {
    const log = [
      newEvent("patient.created", "p1", { identity: identity("Ana"), provisionalFolio: "A-0001" }, A, { id: "c1", at: at("01-01") }),
      newEvent("field.updated", "p1", { field: "identity.phone", value: "222", prev: "c1" }, A, { id: "b", at: at("01-02") }),
      newEvent("field.updated", "p1", { field: "identity.phone", value: "111", prev: "c1" }, B, { id: "a", at: at("01-02") }),
    ];
    const p = project(log).patients.p1;
    // same `at`: "a" sorts before "b", so "b" wins
    expect(p.identity.phone).toBe("222");
    expect(p.fieldHistory.map((f) => f.eventId)).toEqual(["a", "b"]);
    // "b" replaced c1 although "a" already had: concurrent edit
    expect(p.fieldHistory.map((f) => f.conflict)).toEqual([false, true]);
  });

  it("applies history fields and confirmations", () => {
    const log = [
      newEvent("patient.created", "p1", { identity: identity("Ana"), provisionalFolio: "A-0001" }, A, { id: "c1", at: at("01-01") }),
      newEvent("history.confirmed", "p1", { history: { menarcheAge: 12, hpvVaccinated: false } }, doc, { id: "h1", at: at("01-02") }),
      newEvent("field.updated", "p1", { field: "history.hpvVaccinated", value: true, prev: null }, doc, { id: "h2", at: at("01-03") }),
    ];
    const p = project(log).patients.p1;
    expect(p.history).toEqual({ menarcheAge: 12, hpvVaccinated: true });
    expect(p.historyConfirmedAt).toBe(at("01-02"));
  });

  it("tolerates an update timestamped before its patient.created (clock skew)", () => {
    const log = [
      newEvent("field.updated", "p1", { field: "identity.phone", value: "999", prev: "c1" }, B, { id: "u1", at: at("01-01") }),
      newEvent("patient.created", "p1", { identity: identity("Ana"), provisionalFolio: "A-0001" }, A, { id: "c1", at: at("01-05") }),
    ];
    expect(project(log).patients.p1.identity.phone).toBe("999");
  });

  it("links a duplicate: survivor keeps folio, alias folios stay searchable, visits merge", () => {
    const log = [
      ...mariaLog(),
      newEvent("patient.created", "p2", { identity: identity("Ma. Ejemplo"), provisionalFolio: "B-0001" }, B, { id: "c2", at: at("05-01") }),
      newEvent("visit.recorded", "p2", { visitId: "v2", site: "Tuxpan", date: "2026-05-01" }, B, { id: "vr2", at: at("05-01") }),
      newEvent("patients.linked", "p1", { survivorId: "p1", aliasId: "p2", reason: "Misma persona" }, A, { id: "l1", at: at("05-04") }),
    ];
    const m = project(log);
    const alias = m.patients.p2;
    expect(alias.status).toBe("alias");
    expect(alias.linkedTo).toBe("p1");
    expect(alias.linkReason).toBe("Misma persona");
    const s = m.patients.p1;
    expect(s.aliasIds).toEqual(["p2"]);
    expect(s.folioAliases).toEqual(["A-0001", "B-0001"]);
    expect(s.visits.map((v) => v.visitId)).toEqual(["v1", "v2"]);
    expect(s.visits[1].patientId).toBe("p2");
    expect(s.timeline.filter((t) => t.eventId === "l1")).toHaveLength(1);
    expect(m.activeIds).toEqual(["p1"]);
    expect(findByFolio(m, "b-0001")?.patientId).toBe("p1");
    expect(findByFolio(m, "2026-0143")?.patientId).toBe("p1");
    expect(findByFolio(m, "A-0001")?.patientId).toBe("p1");
    expect(resolvePatient(m, "p2")?.patientId).toBe("p1");
  });

  it("resolves link chains and ignores cycles", () => {
    const log = [
      newEvent("patient.created", "p1", { identity: identity("Ana"), provisionalFolio: "A-0001" }, A, { id: "c1", at: at("01-01") }),
      newEvent("patient.created", "p2", { identity: identity("Ana"), provisionalFolio: "A-0002" }, A, { id: "c2", at: at("01-01") }),
      newEvent("patient.created", "p3", { identity: identity("Ana"), provisionalFolio: "A-0003" }, A, { id: "c3", at: at("01-01") }),
      newEvent("patients.linked", "p2", { survivorId: "p2", aliasId: "p3", reason: "x" }, A, { id: "l1", at: at("01-02") }),
      newEvent("patients.linked", "p1", { survivorId: "p1", aliasId: "p2", reason: "x" }, A, { id: "l2", at: at("01-03") }),
      newEvent("patients.linked", "p3", { survivorId: "p3", aliasId: "p1", reason: "cycle" }, A, { id: "l3", at: at("01-04") }),
    ];
    const m = project(log);
    expect(m.activeIds).toEqual(["p1"]);
    expect(m.patients.p3.linkedTo).toBe("p1");
    expect(m.patients.p1.folioAliases).toEqual(["A-0002", "A-0003"]);
  });

  it("records pairs marked distinct on both sides", () => {
    const log = [
      newEvent("patient.created", "p1", { identity: identity("María Ejemplo"), provisionalFolio: "A-0001" }, A, { id: "c1", at: at("01-01") }),
      newEvent("patient.created", "p2", { identity: identity("María Ejemplar", "1990-07-02"), provisionalFolio: "A-0002" }, A, { id: "c2", at: at("01-01") }),
      newEvent("patients.marked_distinct", "p2", { otherPatientId: "p1" }, A, { id: "d1", at: at("01-02") }),
      newEvent("patients.marked_distinct", "p1", { otherPatientId: "p2" }, A, { id: "d2", at: at("01-03") }),
    ];
    const m = project(log);
    expect(m.distinctPairs).toEqual([["p1", "p2"]]);
    expect(areMarkedDistinct(m, "p1", "p2")).toBe(true);
    expect(areMarkedDistinct(m, "p2", "p1")).toBe(true);
    expect(m.patients.p1.timeline.map((t) => t.eventId)).toContain("d1");
  });

  it("sorts active patients: final folios first, then provisional", () => {
    const log = [
      newEvent("patient.created", "pa", { identity: identity("A"), provisionalFolio: "B-0001" }, B, { id: "c1", at: at("01-01") }),
      newEvent("patient.created", "pb", { identity: identity("B"), provisionalFolio: "A-0001" }, A, { id: "c2", at: at("01-01") }),
      newEvent("patient.created", "pc", { identity: identity("C"), provisionalFolio: "A-0002" }, A, { id: "c3", at: at("01-01") }),
      newEvent("folio.assigned", "pc", { folio: "2026-0001", provisionalFolio: "A-0002" }, A, { id: "f1", at: at("01-02") }),
    ];
    expect(project(log).activeIds).toEqual(["pc", "pb", "pa"]);
  });
});

describe("records source", () => {
  it("loads, appends and re-projects", async () => {
    const store = new MemoryEventStore();
    const src = createRecordsSource(store);
    let notified = 0;
    src.subscribe(() => notified++);
    await src.refresh();
    expect(src.getState().model.activeIds).toEqual([]);
    const log = mariaLog();
    expect(await src.append(log)).toBe(log.length);
    expect(await src.append(log)).toBe(0);
    expect(src.getState().model.patients.p1.folio).toBe("2026-0143");
    expect(src.getState().version).toBe(3);
    expect(notified).toBeGreaterThan(0);
  });
});

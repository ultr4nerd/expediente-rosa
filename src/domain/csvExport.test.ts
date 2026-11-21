import { describe, expect, it } from "vitest";
import { newEvent } from "./factory";
import { project } from "./projection";
import { seedEvents } from "./seed";
import { countsByMonthSiteService, countsCsv } from "./csvExport";

const actor = { device: "B", author: "u", role: "medico" as const, jornadaId: "j" };

describe("csv export", () => {
  const events = seedEvents();

  it("counts services and unique patients by month, site and service", () => {
    const rows = countsByMonthSiteService(project(events));
    const total = rows.reduce((n, r) => n + r.services, 0);
    expect(total).toBe(events.filter((e) => e.type === "service.recorded").length);
    const feb = rows.find((r) => r.month === "2026-02" && r.service === "citologia");
    expect(feb?.site).toMatch(/Zapotitlán/);
    expect(feb!.patients).toBeGreaterThan(0);
  });

  it("counts a linked duplicate once", () => {
    const dupVisit = [
      newEvent("patient.created", "dup", {
        identity: { fullName: "María Ejemplo", birthDate: "1979-04-18", birthState: "Jalisco", residence: "", municipality: "", affiliation: "ninguno", hasCartilla: false },
        provisionalFolio: "B-0001",
      }, actor, { id: "d1", at: "2026-02-12T20:00:00.000Z" }),
      newEvent("visit.recorded", "dup", { visitId: "dv", site: "Zapotitlán de Vadillo, plaza principal", date: "2026-02-12" }, actor, { id: "d2", at: "2026-02-12T20:00:00.000Z" }),
      newEvent("service.recorded", "dup", { serviceId: "ds", visitId: "dv", serviceType: "citologia", fields: { citologyKind: "primera_vez", gynecoObstetricStatus: [], cervixObservation: [], riskFactors: [], repeatedSample: false } }, actor, { id: "d3", at: "2026-02-12T20:00:00.000Z" }),
    ];
    const key = (rows: ReturnType<typeof countsByMonthSiteService>) => rows.find((r) => r.month === "2026-02" && r.service === "citologia")!;
    const before = key(countsByMonthSiteService(project([...events, ...dupVisit])));
    const linked = newEvent("patients.linked", "seed-patient-001", { survivorId: "seed-patient-001", aliasId: "dup", reason: "x" }, actor, { id: "l", at: "2026-02-13T00:00:00.000Z" });
    const after = key(countsByMonthSiteService(project([...events, ...dupVisit, linked])));
    expect(after.services).toBe(before.services);
    expect(after.patients).toBe(before.patients - 1);
  });

  it("writes no personal data and quotes cells with commas", () => {
    const csv = countsCsv(countsByMonthSiteService(project(events)));
    expect(csv.startsWith("﻿mes,sede,servicio,servicios,pacientes_unicas\r\n")).toBe(true);
    expect(csv).toContain('"Tuxpan, centro de salud"');
    expect(csv).not.toMatch(/María|Ejemplo|341555|CIT-|\d{4}-\d{4}\b|S-00|seed-/);
  });
});

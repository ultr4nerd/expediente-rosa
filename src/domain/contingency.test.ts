import { describe, expect, it } from "vitest";
import { newEvent } from "./factory";
import { project, findByFolio } from "./projection";
import { searchPatients } from "./matching";
import { nextPaperFolios, normalizePaperFolio, paperIntakeEvent } from "./contingency";

const actor = { device: "A", author: "u", role: "capturista" as const, jornadaId: "j" };
const created = newEvent("patient.created", "p1", {
  identity: { fullName: "Rosa Pérez", birthDate: "1980-01-01", birthState: "Jalisco", residence: "", municipality: "Tuxpan", affiliation: "ninguno", hasCartilla: false },
  provisionalFolio: "A-0004",
}, actor, { id: "c1", at: "2026-05-10T15:00:00.000Z" });

describe("contingency", () => {
  it("reserves paper folios in their own series, after typed-in and printed ones", () => {
    expect(nextPaperFolios([], "A", 3)).toEqual(["PA-0001", "PA-0002", "PA-0003"]);
    const typed = paperIntakeEvent("p1", "PA-0002", actor, "2026-05-10T15:00:00.000Z");
    expect(nextPaperFolios([created, typed], "A", 2)).toEqual(["PA-0003", "PA-0004"]);
    expect(nextPaperFolios([created, typed], "A", 1, 7)).toEqual(["PA-0008"]);
    expect(nextPaperFolios([created, typed], "B", 1)).toEqual(["PB-0001"]);
  });

  it("marks the record as typed in from paper and keeps the paper folio searchable", () => {
    const m = project([created, paperIntakeEvent("p1", "PA-0002", actor, "2026-05-10T15:00:01.000Z")]);
    const p = m.patients.p1;
    expect(p.intake).toMatchObject({ source: "papel", paperFolio: "PA-0002" });
    expect(p.folio).toBe("A-0004");
    expect(p.folioAliases).toContain("PA-0002");
    expect(p.timeline.map((t) => t.label)).toContain("Capturada desde hoja de papel PA-0002");
    expect(findByFolio(m, "PA-0002")?.patientId).toBe("p1");
    expect(searchPatients("pa2", [p])[0]?.reasons).toEqual(["Folio anterior PA-0002 (ahora A-0004)"]);
  });

  it("normalizes paper folios", () => {
    expect(normalizePaperFolio("pa3")).toBe("PA-0003");
    expect(normalizePaperFolio(" PB-12 ")).toBe("PB-0012");
    expect(normalizePaperFolio("A-0003")).toBeNull();
  });
});

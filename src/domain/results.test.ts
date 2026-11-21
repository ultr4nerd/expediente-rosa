import { describe, expect, it } from "vitest";
import {
  buildResultPayload,
  canRecordResult,
  canSeeClinical,
  emptyResultDraft,
  validateResult,
} from "./results";

describe("results", () => {
  it("role rules: capturista sees no clinical data and records no result", () => {
    expect(canSeeClinical("capturista")).toBe(false);
    expect(canSeeClinical("patologo")).toBe(true);
    expect(canRecordResult("capturista")).toBe(false);
    expect(canRecordResult("admin")).toBe(false);
    expect(canRecordResult("patologo")).toBe(true);
    expect(canRecordResult("medico")).toBe(true);
  });

  it("citología requires a Bethesda category", () => {
    expect(validateResult("citologia", emptyResultDraft())).toEqual({ bethesda: "Elige la categoría Bethesda." });
    expect(validateResult("citologia", { ...emptyResultDraft(), bethesda: "X" }).bethesda).toBeDefined();
    expect(validateResult("citologia", { ...emptyResultDraft(), bethesda: "LSIL" })).toEqual({});
  });

  it("mama requires BIRADS (0 is valid) and conducta a seguir", () => {
    expect(Object.keys(validateResult("mama", emptyResultDraft()))).toEqual(["birads", "followUp"]);
    expect(validateResult("mama", { ...emptyResultDraft(), birads: 0, followUp: "imagen_complementaria" })).toEqual({});
  });

  it("builds a payload linked to the service with only the relevant fields", () => {
    const cito = buildResultPayload("s1", "citologia", { bethesda: "NILM", birads: 3, repeatStudy: false, notes: "  " });
    expect(cito).toEqual({ serviceId: "s1", bethesda: "NILM", repeatStudy: false });
    const mama = buildResultPayload("s2", "mama", {
      bethesda: "NILM",
      birads: 2,
      followUp: "rutina_1_anio",
      repeatStudy: true,
      notes: " Quiste simple ",
    });
    expect(mama).toEqual({ serviceId: "s2", birads: 2, followUp: "rutina_1_anio", repeatStudy: true, notes: "Quiste simple" });
    expect(() => buildResultPayload("s3", "mama", emptyResultDraft())).toThrow("BI-RADS");
  });
});

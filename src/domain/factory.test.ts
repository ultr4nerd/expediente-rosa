import { describe, expect, it } from "vitest";
import { isFinalFolio, newEvent, nextProvisionalFolio } from "./factory";
import type { Identity } from "./events";

const actor = { device: "A", author: "u-laura", role: "capturista" as const, jornadaId: "j1" };
const identity: Identity = {
  fullName: "María Ejemplo",
  birthDate: "1985-03-14",
  birthState: "Jalisco",
  residence: "Calle 1",
  municipality: "Zapotlán el Grande",
  affiliation: "ninguno",
  hasCartilla: false,
};

describe("factory", () => {
  it("numbers provisional folios per device", () => {
    const e1 = newEvent("patient.created", "p1", { identity, provisionalFolio: "A-0001" }, actor);
    const e2 = newEvent("patient.created", "p2", { identity, provisionalFolio: "B-0001" }, { ...actor, device: "B" });
    expect(nextProvisionalFolio([e1, e2], "A")).toBe("A-0002");
    expect(nextProvisionalFolio([], "B")).toBe("B-0001");
  });

  it("tells final from provisional folios", () => {
    expect(isFinalFolio("2026-0143")).toBe(true);
    expect(isFinalFolio("A-0007")).toBe(false);
  });
});

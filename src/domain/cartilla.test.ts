import { describe, expect, it } from "vitest";
import { project, findByFolio } from "./projection";
import { searchPatients } from "./matching";
import { SEED_MARIA_EJEMPLO, seedEvents } from "./seed";
import { cartillaData, qrMatrix, qrPath } from "./cartilla";

describe("cartilla", () => {
  const m = project(seedEvents());
  const maria = m.patients[SEED_MARIA_EJEMPLO];

  it("shows folio, name and next visit; the QR carries only the folio", () => {
    const c = cartillaData(maria, "2026-11-21");
    expect(c.folio).toBe(maria.folio);
    expect(c.provisional).toBe(false);
    expect(c.fullName).toBe("María Ejemplo");
    expect(c.nextVisit).toBe("2027-02-12");
    expect(c.qrText).toBe(maria.folio);
  });

  it("builds a QR path with a quiet zone", () => {
    const { size, d } = qrPath("2026-0101");
    expect(size).toBe(21 + 8);
    expect(d.startsWith("M")).toBe(true);
    const grid = qrMatrix("2026-0101");
    expect(grid[0].every((v) => !v)).toBe(true); // quiet zone
    expect(grid[4][4]).toBe(true); // finder pattern corner
  });

  it("a folio read from the card (pasted or scanned) opens the record", () => {
    const folio = cartillaData(maria, "2026-11-21").qrText;
    expect(findByFolio(m, folio)?.patientId).toBe(SEED_MARIA_EJEMPLO);
    const candidates = m.activeIds.map((id) => m.patients[id]);
    expect(searchPatients(` ${folio} `, candidates)[0]?.patientId).toBe(SEED_MARIA_EJEMPLO);
  });
});

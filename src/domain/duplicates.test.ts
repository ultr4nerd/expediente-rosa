import { describe, expect, it } from "vitest";
import type { Identity } from "./events";
import { confirmLink, findDuplicateProposals, rejectLink, type DuplicateCandidate } from "./duplicates";

const identity = (fullName: string, birthDate: string, extra: Partial<Identity> = {}): Identity => ({
  fullName,
  birthDate,
  birthState: "Jalisco",
  residence: "Calle 1",
  municipality: "Tuxpan",
  phone: "3415551111",
  affiliation: "ninguno",
  hasCartilla: true,
  ...extra,
});

const rec = (patientId: string, fullName: string, birthDate: string, device: string, folio: string, at: string, extra: Partial<DuplicateCandidate> = {}): DuplicateCandidate => ({
  patientId,
  identity: identity(fullName, birthDate),
  folio,
  created: { device, at },
  ...extra,
});

const actor = { device: "A", author: "u-ana", role: "medico" as const, jornadaId: "j1" };

describe("findDuplicateProposals", () => {
  const onA = rec("pa", "Rosa Martínez Cruz", "1966-06-05", "A", "A-0004", "2026-05-10T15:00:00.000Z");
  const onB = rec("pb", "Ma. Rosa Martinez de la Cruz", "1966-06-05", "B", "B-0002", "2026-05-10T15:20:00.000Z");
  const unrelated = rec("pc", "Juana Pérez", "1988-02-27", "B", "B-0003", "2026-05-10T15:30:00.000Z");

  it("proposes linking two offline registrations of the same patient", () => {
    const [p, ...rest] = findDuplicateProposals([onB, unrelated, onA]);
    expect(rest).toEqual([]);
    expect(p.survivorId).toBe("pa");
    expect(p.aliasId).toBe("pb");
    expect(p.reasons).toContain("Misma fecha de nacimiento");
    expect(p.reasons).toContain("Registradas en equipos distintos (A y B)");
  });

  it("prefers the record that already has a final folio as survivor", () => {
    const [p] = findDuplicateProposals([onA, { ...onB, folio: "2026-0150" }]);
    expect(p.survivorId).toBe("pb");
  });

  it("never proposes on the name alone, nor for pairs marked distinct, aliases or same device", () => {
    const sameNameOtherPerson = rec("pd", "Rosa Martínez Cruz", "1990-01-01", "B", "B-0004", "2026-05-10T16:00:00.000Z", {
      identity: identity("Rosa Martínez Cruz", "1990-01-01", { phone: "3415559999" }),
    });
    expect(findDuplicateProposals([onA, sameNameOtherPerson])).toEqual([]);
    expect(findDuplicateProposals([onA, { ...onB, distinctFrom: ["pa"] }])).toEqual([]);
    expect(findDuplicateProposals([onA, { ...onB, status: "alias" }])).toEqual([]);
    expect(findDuplicateProposals([onA, { ...onB, created: { device: "A", at: "2026-05-10T15:20:00.000Z" } }])).toEqual([]);
  });

  it("filters to recently pulled records", () => {
    expect(findDuplicateProposals([onA, onB], { onlyIds: ["pc"] })).toEqual([]);
    expect(findDuplicateProposals([onA, onB], { onlyIds: ["pb"] })).toHaveLength(1);
  });

  it("builds the confirmation and rejection events", () => {
    const link = confirmLink({ survivorId: "pa", aliasId: "pb" }, actor, undefined, { id: "l1", at: "2026-05-11T00:00:00.000Z" });
    expect(link).toMatchObject({ id: "l1", type: "patients.linked", patientId: "pa", payload: { survivorId: "pa", aliasId: "pb" } });
    const no = rejectLink({ survivorId: "pa", aliasId: "pb" }, actor);
    expect(no).toMatchObject({ type: "patients.marked_distinct", patientId: "pa", payload: { otherPatientId: "pb" } });
  });
});

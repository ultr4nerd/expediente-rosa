import { describe, expect, it } from "vitest";
import type { AnyEvent, Identity } from "./events";
import { newEvent } from "./factory";
import { project } from "./projection";
import { conflictsOf, formatValue, openConflicts, resolutionAt, resolveConflict } from "./conflicts";

const identity: Identity = {
  fullName: "Rosa Prueba",
  birthDate: "1970-01-01",
  birthState: "Jalisco",
  residence: "Calle 1",
  municipality: "Tuxpan",
  phone: "3415550000",
  affiliation: "ninguno",
  hasCartilla: false,
};
const actor = (device: string, author = "u-laura") => ({ device, author, role: "capturista" as const, jornadaId: "j" });

function base(): AnyEvent[] {
  const created = newEvent("patient.created", "p1", { identity, provisionalFolio: "A-0001" }, actor("A"), { id: "e0", at: "2026-11-21T09:00:00" });
  return [created];
}
/** A and B both change the phone offline from the creation (same prev). */
function concurrent(): AnyEvent[] {
  return [
    ...base(),
    newEvent("field.updated", "p1", { field: "identity.phone", value: "3415551111", prev: "e0" }, actor("A"), { id: "ea", at: "2026-11-21T10:00:00" }),
    newEvent("field.updated", "p1", { field: "identity.phone", value: "3415552222", prev: "e0" }, actor("B", "u-ana"), { id: "eb", at: "2026-11-21T10:05:00" }),
  ];
}

describe("field conflicts", () => {
  it("a sequential edit is not a conflict", () => {
    const events = [
      ...base(),
      newEvent("field.updated", "p1", { field: "identity.phone", value: "1", prev: "e0" }, actor("A"), { id: "e1", at: "2026-11-21T10:00:00" }),
      newEvent("field.updated", "p1", { field: "identity.phone", value: "2", prev: "e1" }, actor("B"), { id: "e2", at: "2026-11-21T11:00:00" }),
    ];
    expect(openConflicts(project(events))).toEqual([]);
  });

  it("two edits with the same prev are an open conflict with both values", () => {
    const [c] = openConflicts(project(concurrent()));
    expect(c.field).toBe("identity.phone");
    expect(c.head.eventId).toBe("eb");
    expect(c.contenders.map((x) => [x.value, x.device, x.author])).toEqual([
      ["3415551111", "A", "u-laura"],
      ["3415552222", "B", "u-ana"],
    ]);
  });

  it("is symmetric: whichever arrives later by time is the head, both are contenders", () => {
    const events = concurrent().map((e) => (e.id === "eb" ? { ...e, at: "2026-11-21T09:30:00" } : e));
    const [c] = openConflicts(project(events));
    expect(c.head.eventId).toBe("ea");
    expect(c.contenders.map((x) => x.eventId).sort()).toEqual(["ea", "eb"]);
  });

  it("keeping a value appends a field.updated with prev = head that closes the conflict", () => {
    const events = concurrent();
    const [c] = openConflicts(project(events));
    const keepA = c.contenders.find((x) => x.device === "A")!;
    const resolution = resolveConflict(c, keepA, actor("A", "u-ana"), { now: new Date("2026-11-21T18:00:00Z") });
    expect(resolution.payload).toEqual({ field: "identity.phone", value: "3415551111", prev: "eb" });
    const model = project([...events, resolution]);
    expect(openConflicts(model)).toEqual([]);
    expect(model.patients.p1.identity.phone).toBe("3415551111");
    // History is immutable: the losing value is still there.
    expect(model.patients.p1.fieldHistory.map((f) => f.value)).toContain("3415552222");
  });

  it("three-way conflicts list every contender", () => {
    const events = [
      ...concurrent(),
      newEvent("field.updated", "p1", { field: "identity.phone", value: "3415553333", prev: "e0" }, actor("C"), { id: "ec", at: "2026-11-21T10:10:00" }),
    ];
    const [c] = conflictsOf(project(events).patients.p1);
    expect(c.contenders.map((x) => x.eventId)).toEqual(["ea", "eb", "ec"]);
  });

  it("the resolution sorts after a head whose clock ran ahead", () => {
    expect(resolutionAt("2030-01-01T00:00:00.000Z", new Date("2026-11-21T18:00:00Z")) > "2030-01-01T00:00:00.000Z").toBe(true);
    expect(resolutionAt("2026-11-21T10:00:00", new Date("2026-11-21T18:00:00Z"))).toBe("2026-11-21T18:00:00.000Z");
  });

  it("rejects a value that is not part of the conflict", () => {
    const [c] = openConflicts(project(concurrent()));
    expect(() => resolveConflict(c, { ...c.head, eventId: "other" }, actor("A"))).toThrow();
  });

  it("formats values in Spanish", () => {
    expect(formatValue(true)).toBe("Sí");
    expect(formatValue(null)).toBe("Sin dato");
    expect(formatValue(["Madre", "Tía"])).toBe("Madre, Tía");
  });
});

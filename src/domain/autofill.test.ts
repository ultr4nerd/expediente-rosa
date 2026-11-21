import { describe, expect, it } from "vitest";
import type { AnyEvent, MamaFields } from "./events";
import { newEvent } from "./factory";
import { project } from "./projection";
import { SEED_MARIA_EJEMPLO, seedEvents } from "./seed";
import { citologyKindFor, computeAutofill, formatDate, validateVisit, type VisitDraft } from "./autofill";

const actor = { device: "A", author: "u-ana", role: "medico" as const, jornadaId: "j" };

describe("computeAutofill", () => {
  it("María Ejemplo's second visit: subsecuente and previous cytology number", () => {
    const m = project(seedEvents());
    const a = computeAutofill(m.patients[SEED_MARIA_EJEMPLO], "2026-05-20");
    expect(a.citologyKind.value).toBe("subsecuente");
    expect(a.citologyKind.source.label).toBe("Última citología: 12 feb 2026");
    expect(a.previousCytologyNumber?.value).toBe("CIT-2026-0001");
    expect(a.previousCytologyNumber?.source.date).toBe("2026-02-12");
    expect(a.history?.value.menarcheAge).toBeDefined();
    expect(a.identityFields).toContain("fullName");
    expect(a.reusedCount).toBeGreaterThanOrEqual(10);
  });

  it("brings the last mammogram from a previous breast exam", () => {
    const m = project(seedEvents());
    const withMammo = Object.values(m.patients).find((p) =>
      p.visits.some((v) => v.services.some((s) => s.serviceType === "mama" && (s.fields as MamaFields).previousMammogram)),
    )!;
    const a = computeAutofill(withMammo, "2026-05-20");
    expect(a.previousMammogram?.value).toBe(true);
    expect(a.lastMammogramDate?.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(a.lastMammogramResult?.value).toBe("BIRADS 1");
    expect(a.lastMammogramDate?.source.label).toMatch(/^Revisión mamaria del /);
  });

  it("first visit ever: primera vez, nothing to bring", () => {
    const events: AnyEvent[] = [
      newEvent("patient.created", "p1", {
        identity: { fullName: "Ana", birthDate: "1990-01-01", birthState: "Jalisco", residence: "x", municipality: "Tuxpan", affiliation: "ninguno", hasCartilla: false },
        provisionalFolio: "A-0001",
      }, actor, { id: "c1", at: "2026-05-20T15:00:00.000Z" }),
    ];
    const a = computeAutofill(project(events).patients.p1, "2026-05-20");
    expect(a.citologyKind.value).toBe("primera_vez");
    expect(a.previousCytologyNumber).toBeUndefined();
    expect(a.history).toBeUndefined();
  });

  it("computes reactivo 11 thresholds", () => {
    expect(citologyKindFor(undefined, "2026-05-20")).toBe("primera_vez");
    expect(citologyKindFor("2023-05-20", "2026-05-20")).toBe("subsecuente");
    expect(citologyKindFor("2023-05-19", "2026-05-20")).toBe("primera_vez_3_anios");
    expect(formatDate("2026-02-12")).toBe("12 feb 2026");
  });
});

describe("validateVisit", () => {
  const base: VisitDraft = { site: "Tuxpan", date: "2026-05-20", heightCm: "158", weightKg: "62", bloodPressure: "120/80", glucose: "95", lastMenstrualPeriod: "", reason: "" };
  const v = (d: Partial<VisitDraft>) => validateVisit({ ...base, ...d }, { today: "2026-05-20", birthDate: "1979-04-18" });

  it("accepts a normal visit", () => {
    expect(v({})).toEqual({ errors: {}, warnings: {} });
  });

  it("blocks impossible and future dates", () => {
    expect(v({ date: "2026-02-30" }).errors.date).toBe("La fecha no existe. Revísala.");
    expect(v({ date: "2026-05-21" }).errors.date).toBe("La fecha de la visita no puede ser futura.");
    expect(v({ date: "1970-01-01" }).errors.date).toMatch(/anterior al nacimiento/);
    expect(v({ date: "" }).errors.date).toBeDefined();
    expect(v({ lastMenstrualPeriod: "2026-06-01" }).errors.lastMenstrualPeriod).toMatch(/posterior a la visita/);
    expect(v({ date: "2024-01-10" }).warnings.date).toBeDefined();
  });

  it("blocks impossible ranges and warns on unusual ones", () => {
    expect(v({ heightCm: "15" }).errors.heightCm).toBeDefined();
    expect(v({ heightCm: "130" }).warnings.heightCm).toBeDefined();
    expect(v({ weightKg: "abc" }).errors.weightKg).toBe("El peso debe ser un número.");
    expect(v({ weightKg: "160" }).warnings.weightKg).toBeDefined();
    expect(v({ glucose: "900" }).errors.glucose).toBeDefined();
    expect(v({ glucose: "250" }).warnings.glucose).toBeDefined();
    expect(v({ bloodPressure: "120-80" }).errors.bloodPressure).toMatch(/120\/80/);
    expect(v({ bloodPressure: "80/120" }).errors.bloodPressure).toMatch(/sistólica/);
    expect(v({ bloodPressure: "150/95" }).warnings.bloodPressure).toBe("Presión alta. Avisa al médico.");
    expect(v({ heightCm: "", weightKg: "", glucose: "", bloodPressure: "" })).toEqual({ errors: {}, warnings: {} });
  });

  it("requires the site", () => {
    expect(v({ site: " " }).errors.site).toBeDefined();
  });
});

describe("historyChanges", () => {
  it("emits corrections only for known keys that changed", async () => {
    const { historyChanges } = await import("./autofill");
    const m = project(seedEvents());
    const p = m.patients[SEED_MARIA_EJEMPLO];
    const before = p.history;
    const after = { ...before, hpvVaccinated: !before.hpvVaccinated, hpvDoses: 2 };
    expect(historyChanges(p, before, after)).toEqual([{ field: "history.hpvVaccinated", value: !before.hpvVaccinated, prev: null }]);
    expect(historyChanges(p, before, { ...before })).toEqual([]);
  });
});

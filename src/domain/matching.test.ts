import { describe, expect, it } from "vitest";
import type { Identity } from "./events";
import {
  curpKey,
  jaroWinkler,
  looksLikeFolio,
  matchPatients,
  nameSimilarity,
  normalizeFolio,
  normalizeName,
  searchByFolio,
  searchPatients,
  type MatchCandidate,
} from "./matching";

const identity = (fullName: string, birthDate: string, extra: Partial<Identity> = {}): Identity => ({
  fullName,
  birthDate,
  birthState: "Jalisco",
  residence: "Calle 1",
  municipality: "Zapotitlán de Vadillo",
  phone: "3415550142",
  affiliation: "ninguno",
  hasCartilla: true,
  ...extra,
});

const ejemplo: MatchCandidate = {
  patientId: "p1",
  identity: identity("María Ejemplo", "1979-04-18"),
  folio: "2026-0143",
  folioAliases: ["A-0007"],
};
const ejemplar: MatchCandidate = {
  patientId: "p2",
  identity: identity("María Ejemplar", "1983-10-02", { municipality: "Tuxpan", phone: "3415557781" }),
  folio: "B-0003",
};
const other: MatchCandidate = { patientId: "p3", identity: identity("Juana Pérez García", "1988-02-27"), folio: "2026-0150" };
const all = [ejemplo, ejemplar, other];

describe("normalization", () => {
  it("strips accents, expands Ma. and drops connectors", () => {
    expect(normalizeName("María Ejemplo")).toBe("maria ejemplo");
    expect(normalizeName("Ma. Guadalupe Hernández")).toBe("maria guadalupe hernandez");
    expect(normalizeName("MA GPE de la Cruz")).toBe("maria guadalupe cruz");
    expect(normalizeName("Rosa Elena Martínez del Toro")).toBe("rosa elena martinez toro");
    expect(normalizeName("  Íñiguez,  Carmen ")).toBe("iniguez carmen");
  });

  it("ignores surname order and abbreviations in similarity", () => {
    expect(nameSimilarity("Ejemplo María", "María Ejemplo")).toBe(1);
    expect(nameSimilarity("Ma. Guadalupe Hernández López", "María Guadalupe Hernandez Lopez")).toBe(1);
    expect(nameSimilarity("Maria Ejemplo", "María Ejemplo Ramírez")).toBeGreaterThan(0.9);
    expect(nameSimilarity("María Ejemplo", "Juana Pérez")).toBeLessThan(0.75);
  });

  it("computes Jaro-Winkler", () => {
    expect(jaroWinkler("martha", "marhta")).toBeCloseTo(0.961, 3);
    expect(jaroWinkler("abc", "abc")).toBe(1);
    expect(jaroWinkler("", "abc")).toBe(0);
  });
});

describe("curpKey", () => {
  it("builds 16 chars and skips María in compound names", () => {
    const k = curpKey({ fullName: "Rosa Elena Martínez de la Cruz", birthDate: "1966-06-05", birthState: "Jalisco" });
    expect(k).toHaveLength(16);
    expect(k).toBe("MACR660605MJCRRS");
    expect(curpKey({ fullName: "Ma. Guadalupe Hernández López", birthDate: "1971-12-12", birthState: "Jalisco" }).slice(0, 4)).toBe("HELG");
    expect(curpKey({ fullName: "María Ejemplo", birthDate: "1979-04-18", birthState: "Colima" })).toBe("EEXM790418MCMJXR");
  });
});

describe("matchPatients", () => {
  it("'Maria Ejenplo' finds both Marías with different reasons", () => {
    const r = matchPatients({ fullName: "Maria Ejenplo", birthDate: "1979-04-18", municipality: "Zapotitlán de Vadillo" }, all);
    expect(r.map((x) => x.patientId)).toEqual(["p1", "p2"]);
    const [a, b] = r;
    expect(a.reasons).toContain("Misma fecha de nacimiento");
    expect(a.reasons).toContain("Mismo municipio");
    expect(a.reasons.some((x) => /^Nombre \d+ % parecido$/.test(x))).toBe(true);
    expect(b.reasons).toContain("Fecha de nacimiento distinta");
    expect(b.reasons).toContain("Otro municipio (Tuxpan)");
    expect(a.score).toBeGreaterThan(b.score);
    expect(a.reasons).not.toEqual(b.reasons);
  });

  it("finds both by name alone from the search box", () => {
    const r = searchPatients("Maria Ejenplo", all);
    expect(r.map((x) => x.patientId).sort()).toEqual(["p1", "p2"]);
    expect(r[0].reasons[0]).not.toBe(r[1].reasons[0]);
  });

  it("reports phone and near-miss birth dates", () => {
    const [r] = matchPatients({ fullName: "María Ejemplo", birthDate: "1979-04-19", phone: "341 555 0142" }, [ejemplo]);
    expect(r.reasons).toEqual(["Mismo nombre", "Mismos últimos 4 dígitos de teléfono", "Fecha de nacimiento casi igual (posible error de captura)"]);
    const [s] = matchPatients({ fullName: "María Ejemplo", phone: "3410000000" }, [ejemplo]);
    expect(s.reasons).toContain("Teléfono distinto");
  });

  it("excludes self, aliases and pairs marked distinct; never returns an action", () => {
    const marked = { ...ejemplar, distinctFrom: ["p1"] };
    const alias = { ...ejemplo, patientId: "p9", status: "alias" as const };
    const r = matchPatients({ fullName: "María Ejemplo" }, [ejemplo, marked, alias], { selfId: "p1" });
    expect(r).toEqual([]);
    const r2 = matchPatients({ fullName: "María Ejemplo" }, all);
    for (const x of r2) expect(Object.keys(x).sort()).toEqual(["candidate", "patientId", "reasons", "score", "signals"]);
  });
});

describe("folio search", () => {
  it("detects and normalizes folios", () => {
    expect(looksLikeFolio("A-0007")).toBe(true);
    expect(looksLikeFolio("a7")).toBe(true);
    expect(looksLikeFolio("2026-143")).toBe(true);
    expect(looksLikeFolio("María")).toBe(false);
    expect(normalizeFolio("a7")).toBe("A-0007");
    expect(normalizeFolio("2026-143")).toBe("2026-0143");
  });

  it("finds by final folio and by provisional alias", () => {
    expect(searchByFolio("2026-0143", all).map((r) => r.patientId)).toEqual(["p1"]);
    const [r] = searchPatients("a-7", all);
    expect(r.patientId).toBe("p1");
    expect(r.reasons).toEqual(["Folio anterior A-0007 (ahora 2026-0143)"]);
    expect(searchPatients("B-0003", all)[0].reasons).toEqual(["Folio B-0003"]);
    expect(searchPatients("Z-0001", all)).toEqual([]);
  });
});

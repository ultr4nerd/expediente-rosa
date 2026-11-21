import { describe, expect, it } from "vitest";
import { eiraKey, looksLikeEiraKey, searchByEiraKey, type MatchCandidate } from "./matching";
import type { Identity } from "./events";

const id = (fullName: string, birthDate: string): Identity => ({
  fullName, birthDate, birthState: "Jalisco", residence: "", municipality: "", affiliation: "ninguno", hasCartilla: false,
});
const cand = (patientId: string, identity: Identity): MatchCandidate => ({ patientId, identity, folio: `A-000${patientId}` });

describe("EIRA key", () => {
  it("follows EIRA's paper rule: 2 + 1 + 1 letters and YYMMDD", () => {
    expect(eiraKey(id("Mauricio Chávez Olea", "1998-12-21"))).toBe("CHOM981221");
    expect(eiraKey(id("María Ejemplo López", "1979-04-18"))).toBe("EJLM790418");
  });

  it("recognizes a typed key", () => {
    expect(looksLikeEiraKey("chom981221")).toBe(true);
    expect(looksLikeEiraKey("A-0007")).toBe(false);
    expect(looksLikeEiraKey("Maria Ejemplo")).toBe(false);
  });

  it("finds every person sharing the key and warns when there are several", () => {
    const c = [cand("1", id("Mauricio Chávez Olea", "1998-12-21")), cand("2", id("Martha Chávez Ortiz", "1998-12-21")), cand("3", id("Ana Ruiz", "1990-01-01"))];
    const r = searchByEiraKey("CHOM981221", c);
    expect(r.map((x) => x.patientId)).toEqual(["1", "2"]);
    expect(r[0].reasons.join(" ")).toContain("Otra paciente comparte esta clave");
  });
});

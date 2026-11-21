import { describe, expect, it } from "vitest";
import { looksLikeFolio } from "./matching";
import { parseSearchText, prefillFromSearch } from "./searchQuery";

describe("search text -> registration prefill", () => {
  it("extracts name, DD/MM/AAAA date and a 10-digit phone", () => {
    expect(prefillFromSearch("Rosa Pérez 03/04/1990", looksLikeFolio)).toEqual({ fullName: "Rosa Pérez", birthDate: "1990-04-03" });
    expect(prefillFromSearch("Ana López 3415551234", looksLikeFolio)).toEqual({ fullName: "Ana López", phone: "3415551234" });
    expect(prefillFromSearch(" 5/3/1985  Ma. Luz  (341) 555-1234 ", looksLikeFolio)).toEqual({
      fullName: "Ma. Luz",
      birthDate: "1985-03-05",
      phone: "3415551234",
    });
  });

  it("keeps partial phones for search only and prefills nothing from a folio", () => {
    expect(parseSearchText("María 4567")).toEqual({ fullName: "María", phone: "4567" });
    expect(prefillFromSearch("María 4567", looksLikeFolio)).toEqual({ fullName: "María" });
    expect(prefillFromSearch("A-0007", looksLikeFolio)).toEqual({});
    expect(prefillFromSearch("x", looksLikeFolio)).toEqual({});
  });
});

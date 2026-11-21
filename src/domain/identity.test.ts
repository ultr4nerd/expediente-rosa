import { describe, expect, it } from "vitest";
import { ageOn, birthDateFromMask, emptyDraft, maskBirthDate, toIdentity, validateIdentity, type IdentityDraft } from "./identity";

const today = new Date(2026, 10, 21); // 21 nov 2026

const valid: IdentityDraft = {
  ...emptyDraft(),
  fullName: "  María   Guadalupe Hernández ",
  birthDate: "1985-03-15",
  birthState: "Puebla",
  residence: "Barrio San Juan",
  municipality: "Zapotitlán",
  phone: "222 123 4567",
  affiliation: "ninguno",
  affiliationNumber: "123",
  hasCartilla: "no",
};

describe("ageOn", () => {
  it("counts full years, respecting the birthday", () => {
    expect(ageOn("1985-11-21", today)).toBe(41);
    expect(ageOn("1985-11-22", today)).toBe(40);
  });
  it("rejects impossible calendar dates", () => {
    expect(ageOn("1985-02-30", today)).toBeNull();
    expect(ageOn("1985-13-01", today)).toBeNull();
    expect(ageOn("85-01-01", today)).toBeNull();
  });
});

describe("validateIdentity", () => {
  it("accepts a complete draft", () => {
    expect(validateIdentity(valid, today)).toEqual({});
  });
  it("flags missing required fields", () => {
    const e = validateIdentity(emptyDraft(), today);
    expect(Object.keys(e)).toEqual([
      "fullName", "birthDate", "birthState", "residence", "municipality", "affiliation", "hasCartilla",
    ]);
  });
  it("flags future dates and implausible ages", () => {
    expect(validateIdentity({ ...valid, birthDate: "2027-01-01" }, today).birthDate).toMatch(/futuro/);
    expect(validateIdentity({ ...valid, birthDate: "2020-01-01" }, today).birthDate).toMatch(/6 años/);
    expect(validateIdentity({ ...valid, birthDate: "1900-01-01" }, today).birthDate).toMatch(/126 años/);
  });
  it("checks phone length and email shape only when present", () => {
    expect(validateIdentity({ ...valid, phone: "12345" }, today).phone).toBeDefined();
    expect(validateIdentity({ ...valid, email: "ana@" }, today).email).toBeDefined();
    expect(validateIdentity({ ...valid, phone: "", email: "" }, today)).toEqual({});
  });
  it("requires first name and a surname", () => {
    expect(validateIdentity({ ...valid, fullName: "María" }, today).fullName).toBeDefined();
  });
});

describe("toIdentity", () => {
  it("normalizes and drops empty optionals", () => {
    const id = toIdentity(valid);
    expect(id.fullName).toBe("María Guadalupe Hernández");
    expect(id.phone).toBe("2221234567");
    expect(id.phoneAlt).toBeUndefined();
    expect(id.email).toBeUndefined();
    expect(id.affiliationNumber).toBeUndefined(); // "ninguno" carries no number
    expect(id.hasCartilla).toBe(false);
  });
});

describe("birth date mask", () => {
  it("formats digits as DD/MM/AAAA and converts to ISO when complete", () => {
    expect(maskBirthDate("15031985")).toBe("15/03/1985");
    expect(maskBirthDate("15/03/19")).toBe("15/03/19");
    expect(birthDateFromMask("15/03/1985")).toBe("1985-03-15");
    expect(birthDateFromMask("15/03")).toBe("15/03");
  });
  it("asks to complete a partial date", () => {
    expect(validateIdentity({ ...valid, birthDate: "15/03" }, today).birthDate).toMatch(/DD\/MM\/AAAA/);
    expect(validateIdentity({ ...valid, birthDate: birthDateFromMask("30/02/1985") }, today).birthDate).toMatch(/no existe/);
  });
});

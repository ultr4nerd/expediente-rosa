import { describe, expect, it } from "vitest";
import { MemoryEventStore } from "@/platform/memory";
import { SEED_MARIA_EJEMPLAR, SEED_MARIA_EJEMPLO, seedEvents, seedIfEmpty } from "./seed";

describe("seed", () => {
  const events = seedEvents();
  const created = events.filter((e) => e.type === "patient.created");

  it("is deterministic with unique ids and about 30 patients", () => {
    expect(JSON.stringify(seedEvents())).toBe(JSON.stringify(events));
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
    expect(created.length).toBeGreaterThanOrEqual(28);
    expect(new Set(created.map((e) => e.patientId)).size).toBe(created.length);
  });

  it("gives María Ejemplo a February 2026 citología with a cytology number", () => {
    const maria = created.find((e) => e.patientId === SEED_MARIA_EJEMPLO);
    expect(maria?.type === "patient.created" && maria.payload.identity.fullName).toBe("María Ejemplo");
    const cito = events.find((e) => e.patientId === SEED_MARIA_EJEMPLO && e.type === "service.recorded");
    expect(cito?.type === "service.recorded" && cito.payload.serviceType).toBe("citologia");
    expect(cito?.type === "service.recorded" && cito.payload.cytologyNumber).toMatch(/^CIT-2026-/);
    expect(cito?.at.startsWith("2026-02")).toBe(true);
  });

  it("has María Ejemplar as a different person with another birth date", () => {
    const get = (id: string) => {
      const e = created.find((c) => c.patientId === id);
      return e?.type === "patient.created" ? e.payload.identity : undefined;
    };
    expect(get(SEED_MARIA_EJEMPLAR)?.fullName).toBe("María Ejemplar");
    expect(get(SEED_MARIA_EJEMPLAR)?.birthDate).not.toBe(get(SEED_MARIA_EJEMPLO)?.birthDate);
  });

  it("includes citologías and breast exams with a prior mammogram", () => {
    const services = events.filter((e) => e.type === "service.recorded");
    expect(services.some((e) => e.type === "service.recorded" && e.payload.serviceType === "citologia")).toBe(true);
    expect(
      services.some(
        (e) => e.type === "service.recorded" && e.payload.serviceType === "mama" && "previousMammogram" in e.payload.fields && e.payload.fields.previousMammogram,
      ),
    ).toBe(true);
  });

  it("seedIfEmpty loads once", async () => {
    const store = new MemoryEventStore();
    expect(await seedIfEmpty(store)).toBe(events.length);
    expect(await seedIfEmpty(store)).toBe(0);
  });
});

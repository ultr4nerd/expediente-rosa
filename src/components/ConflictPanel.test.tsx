import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NavigationProvider } from "@/app/navigation";
import { SessionProvider } from "@/app/session";
import { createRecordsSource } from "@/app/useRecords";
import type { AnyEvent, Identity } from "@/domain/events";
import { newEvent } from "@/domain/factory";
import { MemoryEventStore } from "@/platform/memory";
import { ConflictBadge } from "./ConflictBadge";
import { ConflictPanel } from "./ConflictPanel";

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
const actor = (device: string, author: string) => ({ device, author, role: "capturista" as const, jornadaId: "j" });

const events: AnyEvent[] = [
  newEvent("patient.created", "p1", { identity, provisionalFolio: "A-0001" }, actor("A", "u-laura"), { id: "e0", at: "2026-11-21T09:00:00" }),
  newEvent("field.updated", "p1", { field: "identity.phone", value: "3415551111", prev: "e0" }, actor("A", "u-laura"), { id: "ea", at: "2026-11-21T10:00:00" }),
  newEvent("field.updated", "p1", { field: "identity.phone", value: "3415552222", prev: "e0" }, actor("B", "u-ana"), { id: "eb", at: "2026-11-21T10:05:00" }),
];

async function sourceWith(list: AnyEvent[]) {
  const store = new MemoryEventStore();
  await store.append(list);
  const source = createRecordsSource(store);
  await source.refresh();
  return source;
}

const wrap = (el: React.ReactElement) =>
  renderToStaticMarkup(
    <SessionProvider>
      <NavigationProvider initial={{ name: "sync" }}>{el}</NavigationProvider>
    </SessionProvider>,
  );

describe("Conflictos", () => {
  it("shows both values with device, author and time", async () => {
    const html = wrap(<ConflictPanel source={await sourceWith(events)} />);
    expect(html).toContain("Conflictos (1)");
    expect(html).toContain("Teléfono de Rosa Prueba");
    expect(html).toContain("3415551111");
    expect(html).toContain("3415552222");
    expect(html).toContain("Equipo A");
    expect(html).toContain("Equipo B");
    expect(html).toContain("Laura Méndez");
    expect(html).toContain("Dra. Ana Robles");
  });

  it("the patient header badge counts open conflicts; nothing without them", async () => {
    expect(wrap(<ConflictBadge patientId="p1" source={await sourceWith(events)} />)).toContain("1 dato en conflicto");
    expect(wrap(<ConflictBadge patientId="p1" source={await sourceWith(events.slice(0, 2))} />)).toBe("");
    expect(wrap(<ConflictPanel source={await sourceWith(events.slice(0, 2))} />)).toBe("");
  });
});

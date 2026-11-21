import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SessionProvider } from "@/app/session";
import { createRecordsSource } from "@/app/useRecords";
import { confirmLink, findDuplicateProposals, rejectLink } from "@/domain/duplicates";
import type { AnyEvent, Identity } from "@/domain/events";
import { newEvent } from "@/domain/factory";
import { findByFolio, project } from "@/domain/projection";
import { MemoryEventStore } from "@/platform/memory";
import { DuplicatesPanel } from "./DuplicatesPanel";

const identity = (fullName: string): Identity => ({
  fullName,
  birthDate: "1966-06-05",
  birthState: "Jalisco",
  residence: "Calle 1",
  municipality: "Tuxpan",
  phone: "3415551111",
  affiliation: "ninguno",
  hasCartilla: true,
});
const actor = (device: string) => ({ device, author: "u-laura", role: "capturista" as const, jornadaId: "j1" });

/** Same woman registered offline on laptops A and B; the central assigned a final folio to A's record. */
function offlinePair(): AnyEvent[] {
  return [
    newEvent("patient.created", "pa", { identity: identity("Rosa Martínez Cruz"), provisionalFolio: "A-0004" }, actor("A"), { at: "2026-11-21T10:00:00" }),
    newEvent("patient.created", "pb", { identity: identity("Ma. Rosa Martinez de la Cruz"), provisionalFolio: "B-0002" }, actor("B"), { at: "2026-11-21T10:20:00" }),
    newEvent("folio.assigned", "pa", { folio: "2026-0001", provisionalFolio: "A-0004" }, { ...actor("central"), author: "central", role: "admin" }, { at: "2026-11-21T20:00:00" }),
  ];
}

async function sourceWith(events: AnyEvent[]) {
  const store = new MemoryEventStore();
  await store.append(events);
  const source = createRecordsSource(store);
  await source.refresh();
  return source;
}

describe("Posibles duplicados", () => {
  it("lists the proposal with reasons, both identities, folios and both decisions", async () => {
    const html = renderToStaticMarkup(
      <SessionProvider><DuplicatesPanel source={await sourceWith(offlinePair())} /></SessionProvider>,
    );
    expect(html).toContain("Posibles duplicados (1)");
    expect(html).toContain("Rosa Martínez Cruz");
    expect(html).toContain("Ma. Rosa Martinez de la Cruz");
    expect(html).toContain("2026-0001"); // final folio of the survivor
    expect(html).toContain("provisional"); // B-0002 shown as provisional
    expect(html).toContain("Por qué coincide");
    expect(html).toContain("Vincular (misma persona)");
    expect(html).toContain("Son personas distintas");
  });

  it("renders nothing when there are no proposals", async () => {
    const html = renderToStaticMarkup(<SessionProvider><DuplicatesPanel source={await sourceWith([])} /></SessionProvider>);
    expect(html).toBe("");
  });

  it("linking leaves the provisional folio as a searchable alias and removes the proposal", async () => {
    const events = offlinePair();
    const [proposal] = findDuplicateProposals(Object.values(project(events).patients));
    expect(proposal).toMatchObject({ survivorId: "pa", aliasId: "pb" });
    const linked = project([...events, confirmLink(proposal, actor("A"))]);
    expect(findByFolio(linked, "B-0002")?.patientId).toBe("pa");
    expect(findByFolio(linked, "a-0004")?.patientId).toBe("pa");
    expect(findDuplicateProposals(linked.activeIds.map((id) => linked.patients[id]))).toEqual([]);
  });

  it("marking as distinct removes the proposal and keeps both records", async () => {
    const events = offlinePair();
    const [proposal] = findDuplicateProposals(Object.values(project(events).patients));
    const model = project([...events, rejectLink(proposal, actor("A"))]);
    expect(model.activeIds).toHaveLength(2);
    expect(findDuplicateProposals(model.activeIds.map((id) => model.patients[id]))).toEqual([]);
  });
});

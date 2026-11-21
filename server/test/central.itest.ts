import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Valkey } from "iovalkey";
import { createApp, folioYear, KEYS } from "../src/app.ts";

// DB 15 keeps tests away from demo data in DB 0.
const valkey = new Valkey(process.env.VALKEY_TEST_URL ?? "redis://localhost:6379/15");
const app = createApp(valkey);

interface Ev {
  id: string;
  type: string;
  patientId: string;
  at: string;
  device: string;
  author: string;
  role: string;
  jornadaId: string;
  payload: Record<string, unknown>;
}

function ev(type: string, patientId: string, device: string, extra: Partial<Ev> = {}): Ev {
  return {
    id: randomUUID(),
    type,
    patientId,
    at: "2026-11-21T10:00:00",
    device,
    author: "capturista-1",
    role: "capturista",
    jornadaId: "jornada-test",
    payload: type === "patient.created" ? { identity: {}, provisionalFolio: `${device}-0001` } : {},
    ...extra,
  };
}

async function push(device: string, events: Ev[]) {
  const res = await app.request("/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ device, events }),
  });
  return { status: res.status, body: (await res.json()) as { accepted: string[]; duplicates: string[] } };
}

async function pull(after: string) {
  const res = await app.request(`/events?after=${after}`);
  return (await res.json()) as { events: Ev[]; cursor: string };
}

beforeEach(async () => {
  await valkey.flushdb();
});

afterAll(async () => {
  await valkey.flushdb();
  valkey.disconnect();
});

describe("central", () => {
  it("GET /health", async () => {
    const res = await app.request("/health");
    expect(await res.json()).toEqual({ ok: true });
  });

  it("a repeated push yields only duplicates and no new stream entries", async () => {
    const p = randomUUID();
    const batch = [ev("patient.created", p, "A"), ev("privacy.accepted", p, "A")];
    const first = await push("A", batch);
    expect(first.body).toEqual({ accepted: batch.map((e) => e.id), duplicates: [] });
    const lenAfterFirst = await valkey.xlen(KEYS.stream);
    expect(lenAfterFirst).toBe(3); // 2 events + 1 folio.assigned

    const second = await push("A", batch);
    expect(second.body).toEqual({ accepted: [], duplicates: batch.map((e) => e.id) });
    expect(await valkey.xlen(KEYS.stream)).toBe(lenAfterFirst);
    expect(await valkey.get(KEYS.folioCounter("2026"))).toBe("1");
  });

  it.each([
    ["A first", ["A", "B"]],
    ["B first", ["B", "A"]],
  ])("two patients from two devices get 2026-0001 and 2026-0002 (%s)", async (_, order) => {
    const patients = { A: randomUUID(), B: randomUUID() } as Record<string, string>;
    for (const device of order) await push(device, [ev("patient.created", patients[device], device)]);

    const { events } = await pull("0");
    const folios = events.filter((e) => e.type === "folio.assigned");
    expect(folios.map((e) => e.payload.folio)).toEqual(["2026-0001", "2026-0002"]);
    expect(folios.map((e) => e.patientId)).toEqual(order.map((d) => patients[d]));
    for (const f of folios) {
      expect(f).toMatchObject({ device: "central", author: "central", role: "admin", jornadaId: "jornada-test" });
      expect(f.payload.provisionalFolio).toMatch(/^[AB]-0001$/);
    }
    expect(await valkey.hget(KEYS.folioByPatient, patients.A)).toMatch(/^2026-000[12]$/);
  });

  it("never assigns a second folio to the same patient", async () => {
    const p = randomUUID();
    await push("A", [ev("patient.created", p, "A")]);
    // Same patient, different event id (e.g. re-created by a buggy client).
    await push("B", [ev("patient.created", p, "B")]);
    const { events } = await pull("0");
    expect(events.filter((e) => e.type === "folio.assigned")).toHaveLength(1);
    expect(await valkey.get(KEYS.folioCounter("2026"))).toBe("1");
  });

  it("uses the year of the patient.created `at`, not the server clock", async () => {
    expect(folioYear("2026-12-31T23:59:00-06:00")).toBe("2026");
    await push("A", [ev("patient.created", randomUUID(), "A", { at: "2027-01-01T00:01:00" })]);
    const { events } = await pull("0");
    expect(events.find((e) => e.type === "folio.assigned")?.payload.folio).toBe("2027-0001");
  });

  it("pull after a cursor returns only newer events", async () => {
    const p = randomUUID();
    const a = ev("privacy.accepted", p, "A");
    await push("A", [a]);
    const first = await pull("0");
    expect(first.events.map((e) => e.id)).toEqual([a.id]);

    const b = ev("visit.recorded", p, "B");
    await push("B", [b]);
    const second = await pull(first.cursor);
    expect(second.events.map((e) => e.id)).toEqual([b.id]);
    expect(second.cursor).not.toBe(first.cursor);

    const third = await pull(second.cursor);
    expect(third).toEqual({ events: [], cursor: second.cursor });
  });

  it("rejects malformed batches and client-authored folio.assigned", async () => {
    const bad = await app.request("/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ device: "A", events: [{ id: "x" }] }),
    });
    expect(bad.status).toBe(400);
    const forged = await push("A", [ev("folio.assigned", randomUUID(), "A")]);
    expect(forged.status).toBe(400);
    expect(await valkey.xlen(KEYS.stream)).toBe(0);
    expect((await app.request("/events?after=abc")).status).toBe(400);
  });

  it("a device re-sending a pulled folio.assigned counts it as a duplicate", async () => {
    await push("A", [ev("patient.created", randomUUID(), "A")]);
    const folio = (await pull("0")).events.find((e) => e.type === "folio.assigned")!;
    const res = await push("A", [folio]);
    expect(res.body).toEqual({ accepted: [], duplicates: [folio.id] });
  });

  it("GET /stats reports stream length and folio counter", async () => {
    await push("A", [ev("patient.created", randomUUID(), "A")]);
    const res = await app.request("/stats?year=2026");
    expect(await res.json()).toMatchObject({ streamLength: 2, folioCounter: 1, patientsWithFolio: 1 });
  });
});

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import type { Valkey } from "iovalkey";

/** Valkey key layout (docs/specs/sync-protocol-and-platform-contract.md). */
export const KEYS = {
  stream: "{er}:events",
  seen: (eventId: string) => `{er}:seen:${eventId}`,
  folioCounter: (year: string) => `{er}:folio:${year}`,
  folioByPatient: "{er}:folio:by-patient",
} as const;

/** Max events returned by one pull; the client keeps the cursor and pulls again. */
export const PULL_LIMIT = 1000;

const PUSH_SCRIPT = readFileSync(new URL("./push.lua", import.meta.url), "utf8");
const STREAM_ID = /^\d+(-\d+)?$/;

/** Minimal shape the server needs; the payload stays opaque except for patient.created. */
interface WireEvent {
  id: string;
  type: string;
  patientId: string;
  at: string;
  jornadaId: string;
  payload?: { provisionalFolio?: unknown } & Record<string, unknown>;
  [key: string]: unknown;
}

type PushClient = Valkey & {
  erPush(
    seenKey: string,
    streamKey: string,
    byPatientKey: string,
    counterKey: string,
    folioSeenKey: string,
    json: string,
    isPatientCreated: string,
    patientId: string,
    year: string,
    folioTemplate: string,
  ): Promise<[number, string]>;
};

function isWireEvent(e: unknown): e is WireEvent {
  if (typeof e !== "object" || e === null) return false;
  const r = e as Record<string, unknown>;
  return ["id", "type", "patientId", "at", "jornadaId"].every(
    (k) => typeof r[k] === "string" && (r[k] as string).length > 0,
  );
}

/**
 * Folio year comes from the patient.created `at` (local ISO timestamp), not the
 * server clock: a patient registered at 23:59 on Dec 31 belongs to that year.
 * We read the year straight from the string so no timezone conversion moves it.
 */
export function folioYear(at: string): string {
  const m = /^(\d{4})-/.exec(at);
  return m ? m[1] : String(new Date().getFullYear());
}

function folioTemplate(e: WireEvent, folioEventId: string): string {
  const provisional = typeof e.payload?.provisionalFolio === "string" ? e.payload.provisionalFolio : "";
  return JSON.stringify({
    id: folioEventId,
    type: "folio.assigned",
    patientId: e.patientId,
    at: new Date().toISOString(),
    device: "central",
    author: "central",
    role: "admin",
    jornadaId: e.jornadaId,
    payload: { folio: "__FOLIO__", provisionalFolio: provisional },
  });
}

export function createApp(valkey: Valkey) {
  // defineCommand sends EVALSHA and falls back to EVAL (loading the script) on NOSCRIPT.
  valkey.defineCommand("erPush", { numberOfKeys: 5, lua: PUSH_SCRIPT });
  const client = valkey as PushClient;

  const app = new Hono();
  // Open CORS: the Tauri webview origin (tauri://localhost, http://tauri.localhost) varies per OS.
  app.use("*", cors());

  app.get("/health", (c) => c.json({ ok: true }));

  app.post("/events", bodyLimit({ maxSize: 10 * 1024 * 1024 }), async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "body must be JSON" }, 400);
    }
    const events = (body as { events?: unknown })?.events;
    if (!Array.isArray(events)) return c.json({ error: "expected { device, events: Event[] }" }, 400);
    const bad = events.filter((e) => !isWireEvent(e));
    if (bad.length > 0) {
      return c.json({ error: "events need non-empty id, type, patientId, at, jornadaId", invalid: bad.length }, 400);
    }

    const accepted: string[] = [];
    const duplicates: string[] = [];
    // Sequential on purpose: stream order must follow the device's insertion order.
    for (const e of events as WireEvent[]) {
      if (e.type === "folio.assigned") {
        // Only the central authors folios. A device re-sending one it pulled is a duplicate.
        if (await client.exists(KEYS.seen(e.id))) duplicates.push(e.id);
        else return c.json({ error: "folio.assigned is server-authored", id: e.id }, 400);
        continue;
      }
      const isPatientCreated = e.type === "patient.created";
      const year = folioYear(e.at);
      const folioEventId = randomUUID();
      const [ok] = await client.erPush(
        KEYS.seen(e.id),
        KEYS.stream,
        KEYS.folioByPatient,
        KEYS.folioCounter(year),
        KEYS.seen(folioEventId),
        JSON.stringify(e),
        isPatientCreated ? "1" : "0",
        e.patientId,
        year,
        isPatientCreated ? folioTemplate(e, folioEventId) : "",
      );
      (ok === 1 ? accepted : duplicates).push(e.id);
    }
    return c.json({ accepted, duplicates });
  });

  app.get("/events", async (c) => {
    const after = c.req.query("after") ?? "0";
    if (!STREAM_ID.test(after)) return c.json({ error: "after must be a stream id or 0" }, 400);
    // "(" makes the start exclusive: only entries strictly after the cursor.
    const start = after === "0" ? "-" : `(${after}`;
    const entries = await client.xrange(KEYS.stream, start, "+", "COUNT", PULL_LIMIT);
    const events = entries.map(([, fields]: [string, string[]]) => JSON.parse(fields[fields.indexOf("json") + 1]));
    const cursor = entries.length > 0 ? entries[entries.length - 1][0] : after;
    return c.json({ events, cursor });
  });

  // Demo helper: watch the stream and the folio counter grow.
  app.get("/stats", async (c) => {
    const year = c.req.query("year") ?? String(new Date().getFullYear());
    const [streamLength, folioCounter, patientsWithFolio, lastEntry] = await Promise.all([
      client.xlen(KEYS.stream),
      client.get(KEYS.folioCounter(year)),
      client.hlen(KEYS.folioByPatient),
      client.xrevrange(KEYS.stream, "+", "-", "COUNT", 1),
    ]);
    return c.json({
      streamLength,
      year,
      folioCounter: Number(folioCounter ?? 0),
      patientsWithFolio,
      lastStreamId: lastEntry[0]?.[0] ?? null,
    });
  });

  return app;
}

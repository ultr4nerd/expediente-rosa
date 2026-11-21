import { describe, expect, it } from "vitest";
import { MemoryEventStore } from "@/platform/memory";
import { backupFileName, createBackup, parseBackup } from "./backup";
import { seedEvents } from "./seed";

describe("backup", () => {
  const events = seedEvents();

  it("round-trips the event log and restoring twice adds nothing new", async () => {
    const text = JSON.stringify(createBackup(events, "A", new Date("2026-11-21T18:30:00Z")));
    const parsed = parseBackup(text);
    expect(parsed.ok && parsed.events.length).toBe(events.length);
    expect(parsed.ok && parsed.device).toBe("A");
    const store = new MemoryEventStore();
    await store.append(events.slice(0, 10));
    expect(await store.append(parsed.ok ? parsed.events : [])).toBe(events.length - 10);
    expect(await store.append(parsed.ok ? parsed.events : [])).toBe(0);
  });

  it("skips invalid entries and rejects foreign files", () => {
    const text = JSON.stringify(createBackup([...events.slice(0, 2), { id: "x" } as never], "B"));
    const parsed = parseBackup(text);
    expect(parsed.ok && parsed.skipped).toBe(1);
    expect(parseBackup("no json").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ hello: 1 })).ok).toBe(false);
    expect(parseBackup(JSON.stringify(events.slice(0, 3))).ok).toBe(true);
    expect(parseBackup(JSON.stringify({ format: "expediente-rosa-respaldo", version: 99, events: [] })).ok).toBe(false);
  });

  it("names the file with device and local date", () => {
    expect(backupFileName("A", new Date(2026, 10, 21, 18, 5))).toBe("expediente-rosa-respaldo-A-2026-11-21-1805.json");
    expect(backupFileName("A", new Date(2026, 10, 21, 18, 5), "csv", "conteos")).toBe("expediente-rosa-conteos-A-2026-11-21-1805.csv");
  });
});

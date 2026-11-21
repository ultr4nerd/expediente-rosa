// In-memory platform: unit tests, `pnpm dev` in a plain browser, and the PWA plan B.
import type { AnyEvent } from "@/domain/events";
import type { EventStore, SyncStatus, SyncTransport } from "@/domain/ports";

export class MemoryEventStore implements EventStore {
  private events: AnyEvent[] = [];
  private ids = new Set<string>();

  async append(events: AnyEvent[]): Promise<number> {
    let added = 0;
    for (const e of events) {
      if (this.ids.has(e.id)) continue;
      this.ids.add(e.id);
      this.events.push(e);
      added++;
    }
    return added;
  }

  async list(afterSeq = 0): Promise<{ events: AnyEvent[]; lastSeq: number }> {
    return { events: this.events.slice(afterSeq), lastSeq: this.events.length };
  }
}

/** Offline-only transport: sync always reports "offline" and keeps everything pending. */
export class OfflineSyncTransport implements SyncTransport {
  constructor(private store: EventStore) {}

  async status(): Promise<SyncStatus> {
    const { events } = await this.store.list();
    return { connectivity: "offline", pending: events.length };
  }

  async syncNow(): Promise<SyncStatus> {
    return this.status();
  }
}

// Picks the platform at runtime: Tauri when running inside the desktop app, memory otherwise.
import type { EventStore, SyncTransport } from "@/domain/ports";
import { MemoryEventStore, OfflineSyncTransport } from "./memory";
import { TauriEventStore, TauriSyncTransport } from "./tauri";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export interface Platform {
  store: EventStore;
  sync: SyncTransport;
  kind: "tauri" | "memory";
}

function createPlatform(): Platform {
  if (isTauri) {
    return { store: new TauriEventStore(), sync: new TauriSyncTransport(), kind: "tauri" };
  }
  const store = new MemoryEventStore();
  return { store, sync: new OfflineSyncTransport(store), kind: "memory" };
}

export const platform = createPlatform();

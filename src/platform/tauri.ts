// Tauri platform: thin wrappers over the Rust commands defined in docs/specs/sync-protocol-and-platform-contract.md.
import { invoke } from "@tauri-apps/api/core";
import type { AnyEvent } from "@/domain/events";
import type { DeviceInfo, EventStore, SyncStatus, SyncTransport } from "@/domain/ports";

export class TauriEventStore implements EventStore {
  append(events: AnyEvent[]): Promise<number> {
    return invoke<number>("append_events", { events });
  }

  list(afterSeq = 0): Promise<{ events: AnyEvent[]; lastSeq: number }> {
    return invoke("list_events", { afterSeq });
  }
}

export class TauriSyncTransport implements SyncTransport {
  syncNow(centralUrl: string): Promise<SyncStatus> {
    return invoke<SyncStatus>("sync_now", { centralUrl });
  }

  status(): Promise<SyncStatus> {
    return invoke<SyncStatus>("sync_status");
  }
}

export function deviceInfo(): Promise<DeviceInfo> {
  return invoke<DeviceInfo>("device_info");
}

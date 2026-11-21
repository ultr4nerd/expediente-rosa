// Ports between the pure domain/UI and the platform (Tauri + Rust, or in-memory).
// Implementations: src/platform/tauri.ts (real) and src/platform/memory.ts (tests, browser dev, plan B).
import type { AnyEvent } from "./events";

export interface EventStore {
  /** Appends events; events whose id already exists are ignored. Returns how many were new. */
  append(events: AnyEvent[]): Promise<number>;
  /** All events after the local sequence cursor (0 = from the beginning), in insertion order. */
  list(afterSeq?: number): Promise<{ events: AnyEvent[]; lastSeq: number }>;
}

export type Connectivity = "online" | "offline" | "unknown";

export interface SyncStatus {
  connectivity: Connectivity;
  /** Local events not yet acknowledged by the central server. */
  pending: number;
  lastSyncAt?: string;
  lastError?: string;
}

export interface SyncTransport {
  /** Pushes pending local events, pulls remote ones into the store. */
  syncNow(centralUrl: string): Promise<SyncStatus>;
  status(): Promise<SyncStatus>;
}

export interface DeviceInfo {
  device: string;
  dataDir: string;
}

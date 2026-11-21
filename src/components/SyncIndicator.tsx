// Sync state, always visible in the top bar. One shared poller calls syncNow every 10 s
// (contract: docs/specs/sync-protocol-and-platform-contract.md); click = sync now.
import { useEffect, useSyncExternalStore } from "react";
import { Cloud, CloudOff, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SyncStatus } from "@/domain/ports";
import { isTauri, platform } from "@/platform";
import { deviceInfo } from "@/platform/tauri";
import { recordsSource } from "@/app/useRecords";

export const DEFAULT_CENTRAL_URL = "http://localhost:8787";
// Keyed by device: two instances on one machine (the demo) share localStorage, and pointing B at A's
// hub must not repoint A.
let urlKey = "er.centralUrl";
const POLL_MS = 10_000;

interface SyncState {
  status: SyncStatus;
  syncing: boolean;
  centralUrl: string;
}

function readUrl(): string {
  try {
    return localStorage.getItem(urlKey) || DEFAULT_CENTRAL_URL;
  } catch {
    return DEFAULT_CENTRAL_URL;
  }
}

let state: SyncState = {
  status: { connectivity: "unknown", pending: 0 },
  syncing: false,
  centralUrl: readUrl(),
};
const listeners = new Set<() => void>();

const urlReady: Promise<void> = isTauri
  ? deviceInfo()
      .then(({ device }) => {
        urlKey = `er.centralUrl.${device}`;
        set({ centralUrl: readUrl() });
      })
      .catch(() => undefined)
  : Promise.resolve();

function set(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export async function syncNow(): Promise<void> {
  if (state.syncing) return;
  set({ syncing: true });
  try {
    await urlReady;
    const status = await platform.sync.syncNow(state.centralUrl);
    set({ status });
    // Re-project on every poll: pulled events, and events a peer pushed to this laptop as hub (ISS-0021),
    // must show up on every screen even while the central is unreachable.
    await recordsSource().refresh();
  } catch (e) {
    set({ status: { ...state.status, lastError: String(e) } });
  } finally {
    set({ syncing: false });
  }
}

/** Refreshes the counters without touching the network (e.g. right after saving). */
export async function refreshSyncStatus(): Promise<void> {
  try {
    set({ status: await platform.sync.status() });
  } catch {
    // keep the last known status
  }
}

export function setCentralUrl(url: string) {
  const clean = url.trim() || DEFAULT_CENTRAL_URL;
  try {
    localStorage.setItem(urlKey, clean);
  } catch {
    // localStorage unavailable: keep it for this session only
  }
  set({ centralUrl: clean });
}

let pollers = 0;
let timer: ReturnType<typeof setInterval> | undefined;

/** Subscribes to the shared sync state and keeps the 10 s poller alive while mounted. */
export function useSync(): SyncState {
  const snapshot = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
  useEffect(() => {
    if (pollers++ === 0) {
      void syncNow();
      timer = setInterval(() => void syncNow(), POLL_MS);
    }
    return () => {
      if (--pollers === 0) clearInterval(timer);
    };
  }, []);
  return snapshot;
}

export function formatTime(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

export function pendingLabel(n: number): string {
  return n === 1 ? "1 pendiente" : `${n} pendientes`;
}

export function SyncIndicator() {
  const { status, syncing } = useSync();
  const last = formatTime(status.lastSyncAt);
  const online = status.connectivity === "online";
  return (
    <button
      type="button"
      onClick={() => void syncNow()}
      disabled={syncing}
      aria-live="polite"
      title="Sincronizar ahora"
      className="flex min-h-control items-center gap-sm rounded-md px-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {status.connectivity === "unknown" ? (
        <Badge variant="secondary">
          <Loader2 aria-hidden="true" className="animate-spin" />
          Comprobando
        </Badge>
      ) : online ? (
        <Badge variant="success">
          {syncing ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Cloud aria-hidden="true" />}
          En línea
        </Badge>
      ) : (
        <Badge variant="offline">
          {syncing ? <Loader2 aria-hidden="true" className="animate-spin" /> : <CloudOff aria-hidden="true" />}
          Sin conexión
        </Badge>
      )}
      {status.pending > 0 && (
        <Badge variant="warning">
          <Clock aria-hidden="true" />
          {pendingLabel(status.pending)}
        </Badge>
      )}
      {last && <span className="type-caption text-muted-foreground">{last}</span>}
    </button>
  );
}

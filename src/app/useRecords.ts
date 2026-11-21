// React access to the projected records. One shared cache per EventStore, so every screen
// sees the same model and an append in one screen refreshes all of them. No provider needed.
import { useEffect, useSyncExternalStore } from "react";
import type { AnyEvent } from "@/domain/events";
import type { EventStore } from "@/domain/ports";
import { project, type RecordsModel } from "@/domain/projection";
import { seedIfEmpty } from "@/domain/seed";
import { platform } from "@/platform";

export interface RecordsState {
  model: RecordsModel;
  loading: boolean;
  error?: string;
  /** Times the model was (re)projected; 0 until the first load finishes. */
  version: number;
}

export interface RecordsSource {
  getState(): RecordsState;
  subscribe(listener: () => void): () => void;
  /** Reloads every event from the store and re-projects. */
  refresh(): Promise<RecordsModel>;
  /** Appends via the store (duplicates ignored there), then refreshes. Returns how many were new. */
  append(events: AnyEvent[]): Promise<number>;
}

export function createRecordsSource(store: EventStore, opts: { seed?: boolean } = {}): RecordsSource {
  let seeded = !opts.seed;
  let state: RecordsState = { model: project([]), loading: false, version: 0 };
  const listeners = new Set<() => void>();
  let inflight: Promise<RecordsModel> | null = null;

  const set = (next: Partial<RecordsState>) => {
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  };

  const refresh = (): Promise<RecordsModel> => {
    if (inflight) return inflight;
    set({ loading: true });
    // First load on a fresh store: put the fictitious demo patients in (ISS-0004).
    const ready = seeded ? Promise.resolve() : seedIfEmpty(store).then(() => { seeded = true; });
    inflight = ready
      .then(() => store.list(0))
      .then(({ events }) => {
        const model = project(events);
        set({ model, loading: false, error: undefined, version: state.version + 1 });
        return model;
      })
      .catch((err: unknown) => {
        set({ loading: false, error: err instanceof Error ? err.message : String(err) });
        return state.model;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    refresh,
    async append(events) {
      const added = await store.append(events);
      await (inflight ?? Promise.resolve());
      await refresh();
      return added;
    },
  };
}

let defaultSource: RecordsSource | null = null;
/** Shared source over the app's platform store; seeds fictitious demo data when the store is empty. */
export function recordsSource(): RecordsSource {
  defaultSource ??= createRecordsSource(platform.store, { seed: true });
  return defaultSource;
}

/**
 * Current records model. Loads on first use; call `refresh()` after a sync pull and
 * `append(events)` to write and re-project in one step.
 */
export function useRecords(source: RecordsSource = recordsSource()) {
  const state = useSyncExternalStore(source.subscribe, source.getState, source.getState);
  useEffect(() => {
    if (source.getState().version === 0 && !source.getState().loading) void source.refresh();
  }, [source]);
  return { ...state, refresh: source.refresh, append: source.append };
}

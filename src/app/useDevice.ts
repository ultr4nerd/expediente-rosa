// Device letter of this laptop ("A", "B"...): from Rust (ER_DEVICE) in the desktop app, "A" in the browser.
import { useEffect, useState } from "react";
import { isTauri } from "@/platform";
import { deviceInfo } from "@/platform/tauri";

let cached: Promise<string> | null = null;

/** Resolves once per app run; falls back to "A" if Rust is unavailable. */
export function loadDevice(): Promise<string> {
  cached ??= isTauri
    ? deviceInfo()
        .then((d) => d.device || "A")
        .catch(() => "A")
    : Promise.resolve("A");
  return cached;
}

/** React access to the device letter ("A" until Rust answers). */
export function useDevice(): string {
  const [device, setDevice] = useState("A");
  useEffect(() => {
    let alive = true;
    void loadDevice().then((d) => alive && setDevice(d));
    return () => {
      alive = false;
    };
  }, []);
  return device;
}

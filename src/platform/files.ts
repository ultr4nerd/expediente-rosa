// Saving a user-requested file (backup, CSV). In the desktop app the Rust `save_export` command writes it to
// Downloads (webview downloads are unreliable); in a plain browser, a Blob download.
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./index";

/** Saves the file; returns the full path in the desktop app, undefined in the browser. */
export async function saveTextFile(name: string, contents: string, mime: string): Promise<string | undefined> {
  if (isTauri) return invoke<string>("save_export", { name, contents });
  const url = URL.createObjectURL(new Blob([contents], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return undefined;
}

/** Current device letter ("A" in the browser). */
export async function currentDevice(): Promise<string> {
  if (!isTauri) return "A";
  try {
    return (await invoke<{ device: string }>("device_info")).device || "A";
  } catch {
    return "A";
  }
}

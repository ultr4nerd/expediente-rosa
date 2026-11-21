// Full-page print overlay shared by the contingency sheets (ISS-0018) and the Cartilla EIRA (ISS-0024).
// While open, the app root gets `print:hidden`, so only the overlay content prints. Escape closes it.
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { isTauri } from "@/platform";

// window.print() does nothing in the macOS WebView (Tauri): use the native print command there.
function printPage() {
  if (isTauri) void invoke("print_page").catch(() => window.print());
  else window.print();
}

export function PrintOverlay({
  title, hint, controls, printLabel, onPrint, onClose, children,
}: {
  title: string;
  hint?: string;
  controls?: ReactNode;
  printLabel: string;
  onPrint?: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const root = document.getElementById("root");
    root?.classList.add("print:hidden");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      root?.classList.remove("print:hidden");
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 overflow-auto bg-background print:static print:overflow-visible">
      <div className="sticky top-0 flex flex-wrap items-end justify-between gap-md border-b bg-card px-lg py-md print:hidden">
        <div className="flex flex-col gap-xs">
          <h2 className="type-heading">{title}</h2>
          {hint && <p className="type-caption text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex flex-wrap items-end gap-sm">
          {controls}
          <Button type="button" onClick={() => { onPrint?.(); printPage(); }} autoFocus>
            <Printer aria-hidden="true" />
            {printLabel}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            <X aria-hidden="true" />
            Cerrar
          </Button>
        </div>
      </div>
      <div className="flex flex-col items-center gap-lg p-lg print:block print:p-0">{children}</div>
    </div>,
    document.body,
  );
}

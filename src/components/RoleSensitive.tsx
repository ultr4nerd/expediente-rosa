// ISS-0013: sensitive data by role (design/DESIGN.md "Sensitive data by role").
// Hidden data is never shown as empty: empty reads as "no data", so it shows a locked placeholder.
import { useState, type ReactNode } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const LOCKED_TEXT = "Oculto para tu rol"; // design/DESIGN.md "Sensitive data by role"

/** Locked placeholder: `••••` on a sunken surface with a lock icon and the reason. */
export function RoleLocked({ label, className }: { label?: string; className?: string }) {
  return (
    <div
      role="note"
      aria-label={label ? `${label}: ${LOCKED_TEXT}` : LOCKED_TEXT}
      className={cn(
        "flex items-center gap-sm rounded-control border border-dashed bg-surface-sunken px-md py-sm text-on-surface-muted",
        className,
      )}
    >
      <Lock aria-hidden="true" className="size-5 shrink-0" />
      <span aria-hidden="true" className="type-body-strong tracking-widest">••••</span>
      <span className="type-caption">{LOCKED_TEXT}</span>
    </div>
  );
}

/**
 * Shows `children` only to an allowed role, after an explicit "Mostrar".
 * Not allowed: the locked placeholder. The reveal is not logged yet (no event type for it).
 */
export function RoleSensitive({
  allowed,
  label,
  children,
  revealed: initiallyRevealed = false,
}: {
  allowed: boolean;
  label: string;
  children: ReactNode;
  revealed?: boolean;
}) {
  const [revealed, setRevealed] = useState(initiallyRevealed);
  if (!allowed) return <RoleLocked label={label} />;
  if (!revealed) {
    return (
      <div className="flex flex-wrap items-center gap-sm rounded-control bg-surface-sunken px-md py-sm text-on-surface-muted">
        <Lock aria-hidden="true" className="size-5 shrink-0" />
        <span className="type-caption">{label}: dato sensible oculto</span>
        <Button variant="outline" onClick={() => setRevealed(true)}>
          <Eye aria-hidden="true" />Mostrar
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-sm">
      {children}
      <Button variant="ghost" className="self-start" onClick={() => setRevealed(false)}>
        <EyeOff aria-hidden="true" />Ocultar
      </Button>
    </div>
  );
}

/** Label/value row used by the clinical panels. */
export function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-xs">
      <dt className="type-caption text-muted-foreground">{label}</dt>
      <dd className="type-body">{value === undefined || value === "" ? "Sin registro" : value}</dd>
    </div>
  );
}

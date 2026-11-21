// Building blocks for the new-visit form (ISS-0010): groups, fields with error/warning,
// the "Del historial" autofill wrapper and keyboard-friendly chip/choice groups.
import type { ReactNode } from "react";
import { Check, CircleAlert, History, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatDate, type AutofillSource } from "@/domain/autofill";
import { cn } from "@/lib/utils";

export type AutofillStatus = "autofilled" | "confirmed" | "edited";

export function VisitGroup({ title, hint, aside, children }: { title: string; hint?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-md rounded-xl border bg-card p-lg shadow-sm">
      <legend className="sr-only">{title}</legend>
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div className="flex flex-col gap-xs" aria-hidden="true">
          <h2 className="type-heading">{title}</h2>
          {hint && <p className="type-caption text-muted-foreground">{hint}</p>}
        </div>
        {aside}
      </div>
      {children}
    </fieldset>
  );
}

export function VisitField({
  id, label, error, warning, aside, children,
}: { id: string; label: string; error?: string; warning?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-sm">
      <div className="flex min-h-6 flex-wrap items-center justify-between gap-sm">
        <Label htmlFor={id}>{label}</Label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="flex items-center gap-xs type-caption text-danger">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : warning ? (
        <p id={`${id}-msg`} role="status" className="flex items-center gap-xs type-caption text-on-warning-subtle">
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          {warning}
        </p>
      ) : null}
    </div>
  );
}

/** aria props for an input with a message under it. */
export function describedBy(id: string, error?: string, warning?: string) {
  return {
    ...(error ? { "aria-invalid": true as const } : {}),
    ...(error || warning ? { "aria-describedby": `${id}-msg` } : {}),
  };
}

export function AutofillBadge({ source }: { source: AutofillSource }) {
  return (
    <Badge variant="autofill" title={source.label}>
      <History aria-hidden="true" />
      Del historial{source.date ? ` · ${formatDate(source.date)}` : ""}
    </Badge>
  );
}

/**
 * Autofilled field (design/DESIGN.md): autofill background, left border, "Del historial" badge and a
 * "Confirmar" button. Once confirmed or edited it returns to the normal style.
 */
export function AutofillBox({
  status, source, onConfirm, children,
}: { status?: AutofillStatus; source?: AutofillSource; onConfirm: () => void; children: ReactNode }) {
  const active = status === "autofilled" && source;
  return (
    <div className={cn("flex flex-col gap-sm rounded-md", active && "border-l-4 border-autofill-border bg-autofill p-sm text-on-autofill")}>
      {active && (
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <AutofillBadge source={source} />
          <span className="type-caption">{source.label}</span>
        </div>
      )}
      {children}
      {active && (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={onConfirm}>
          <Check aria-hidden="true" />
          Confirmar
        </Button>
      )}
      {status === "confirmed" && source && (
        <p className="flex items-center gap-xs type-caption text-muted-foreground">
          <Check className="size-4" aria-hidden="true" />
          Confirmado del historial
        </p>
      )}
    </div>
  );
}

/** Multi-select chips (checkboxes): keyboard Space toggles, Tab moves. */
export function ChipGroup({
  id, legend, options, value, onChange,
}: { id: string; legend: string; options: Array<{ value: string; label: string }>; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="flex flex-col gap-sm">
      <legend className="type-label mb-sm">{legend}</legend>
      <div className="flex flex-wrap gap-sm">
        {options.map((o, i) => {
          const on = value.includes(o.value);
          return (
            <label key={o.value} className={choiceClass(on)}>
              <input
                id={i === 0 ? id : undefined}
                type="checkbox"
                checked={on}
                onChange={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
                className="size-4 accent-primary"
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Single choice (radios) rendered as large targets. */
export function ChoiceGroup<T extends string>({
  id, legend, name, options, value, onChange,
}: { id: string; legend: string; name: string; options: Array<{ value: T; label: string }>; value: T | ""; onChange: (v: T) => void }) {
  return (
    <fieldset className="flex flex-col gap-sm">
      <legend className="type-label mb-sm">{legend}</legend>
      <div className="flex flex-wrap gap-sm" role="radiogroup">
        {options.map((o, i) => (
          <label key={o.value} className={choiceClass(value === o.value)}>
            <input
              id={i === 0 ? id : undefined}
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="size-4 accent-primary"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const choiceClass = (on: boolean) =>
  cn(
    "flex h-control cursor-pointer items-center gap-sm rounded-md border px-md type-label",
    "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
    on ? "border-primary bg-secondary text-secondary-foreground" : "border-input bg-card hover:bg-accent",
  );

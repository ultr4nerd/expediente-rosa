// ISS-0013: result capture for the pathologist (citología: Bethesda) and the doctor
// (revisión mamaria: BI-RADS + conducta a seguir). Appends `result.recorded` linked to the service.
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CircleAlert, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/app/session";
import { useRecords } from "@/app/useRecords";
import { newEvent } from "@/domain/factory";
import type { ServiceRecord } from "@/domain/projection";
import {
  BETHESDA,
  BIRADS,
  FOLLOW_UP,
  buildResultPayload,
  canRecordResult,
  emptyResultDraft,
  validateResult,
  type Birads,
  type FollowUp,
  type ResultDraft,
  type ResultField,
} from "@/domain/results";
import { isTauri } from "@/platform";
import { deviceInfo } from "@/platform/tauri";

/** Device letter: from Rust in the desktop app, "A" in the browser. */
export function useDevice(): string {
  const [device, setDevice] = useState("A");
  useEffect(() => {
    if (!isTauri) return;
    let alive = true;
    deviceInfo()
      .then((d) => alive && d.device && setDevice(d.device))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return device;
}

const draftFrom = (s: ServiceRecord): ResultDraft =>
  s.result
    ? {
        bethesda: s.result.bethesda,
        birads: s.result.birads,
        followUp: s.result.followUp,
        repeatStudy: s.result.repeatStudy ?? false,
        notes: s.result.notes ?? "",
      }
    : emptyResultDraft();

export function ResultForm({ service, onDone }: { service: ServiceRecord; onDone?: () => void }) {
  const { user, jornadaId } = useSession();
  const { append } = useRecords();
  const device = useDevice();
  const [draft, setDraft] = useState<ResultDraft>(() => draftFrom(service));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user || !canRecordResult(user.role)) return null;

  const type = service.serviceType;
  const errors = validateResult(type, draft);
  const shown = (f: ResultField) => (submitted ? errors[f] : undefined);
  const idFor = (f: string) => `result-${service.serviceId}-${f}`;
  const set = <K extends keyof ResultDraft>(k: K, v: ResultDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (saving || !user) return;
    setSubmitted(true);
    const first = (Object.keys(errors) as ResultField[])[0];
    if (first) {
      document.getElementById(idFor(first))?.focus();
      return;
    }
    setSaving(true);
    try {
      const payload = buildResultPayload(service.serviceId, type, draft);
      const actor = { device, author: user.id, role: user.role, jornadaId };
      await append([newEvent("result.recorded", service.patientId, payload, actor)]);
      toast.success(service.result ? "Resultado corregido." : "Resultado guardado.");
      onDone?.();
    } catch (err) {
      toast.error(`No se pudo guardar el resultado. ${err instanceof Error ? err.message : ""}`.trim());
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="flex max-w-prose flex-col gap-md" aria-label="Registrar resultado">
      {type === "citologia" ? (
        <Field id={idFor("bethesda")} label="Resultado Bethesda" error={shown("bethesda")}>
          <Select value={draft.bethesda ?? ""} onValueChange={(v) => set("bethesda", v)}>
            <SelectTrigger id={idFor("bethesda")} className="w-full" aria-invalid={!!shown("bethesda")}>
              <SelectValue placeholder="Elige la categoría" />
            </SelectTrigger>
            <SelectContent>
              {BETHESDA.map((b) => (
                <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : (
        <Field id={idFor("birads")} label="Clasificación BI-RADS" error={shown("birads")}>
          <Select
            value={draft.birads === undefined ? "" : String(draft.birads)}
            onValueChange={(v) => set("birads", Number(v) as Birads)}
          >
            <SelectTrigger id={idFor("birads")} className="w-full" aria-invalid={!!shown("birads")}>
              <SelectValue placeholder="Elige la categoría" />
            </SelectTrigger>
            <SelectContent>
              {BIRADS.map((b) => (
                <SelectItem key={b.value} value={String(b.value)}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      <Field
        id={idFor("followUp")}
        label={type === "mama" ? "Conducta a seguir" : "Conducta a seguir (opcional)"}
        error={shown("followUp")}
      >
        <Select value={draft.followUp ?? ""} onValueChange={(v) => set("followUp", v as FollowUp)}>
          <SelectTrigger id={idFor("followUp")} className="w-full" aria-invalid={!!shown("followUp")}>
            <SelectValue placeholder="Elige la conducta" />
          </SelectTrigger>
          <SelectContent>
            {FOLLOW_UP.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <label className="flex min-h-control items-center gap-sm type-body">
        <input
          type="checkbox"
          checked={draft.repeatStudy}
          onChange={(e) => set("repeatStudy", e.target.checked)}
          className="size-5 shrink-0 accent-primary"
        />
        Repetir estudio
      </label>

      <Field id={idFor("notes")} label="Observaciones (opcional)">
        <Input id={idFor("notes")} value={draft.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>

      <div className="flex flex-wrap gap-sm">
        <Button type="submit" disabled={saving}>
          <Save aria-hidden="true" />{service.result ? "Guardar corrección" : "Guardar resultado"}
        </Button>
        {onDone && (
          <Button type="button" variant="outline" onClick={onDone}>Cancelar</Button>
        )}
      </div>
    </form>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-xs">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-xs type-caption text-on-danger-subtle">
          <CircleAlert aria-hidden="true" className="size-4" />{error}
        </p>
      )}
    </div>
  );
}

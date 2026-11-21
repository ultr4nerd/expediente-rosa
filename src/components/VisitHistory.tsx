// Stable history in "confirmar" mode (ISS-0010): one click confirms it unchanged (history.confirmed);
// "Editar" opens the fields. Hidden for roles that cannot see sensitive data.
import { Check, Lock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StableHistory } from "@/domain/events";
import type { Autofilled } from "@/domain/autofill";
import { AutofillBadge, ChoiceGroup, VisitField, VisitGroup } from "./VisitFields";

export type HistoryMode = "pending" | "confirmed" | "edit";

const yesNo = (v?: boolean) => (v === undefined ? "Sin dato" : v ? "Sí" : "No");

export function historyRows(h: StableHistory): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  if (h.menarcheAge !== undefined) rows.push(["Menarca", `${h.menarcheAge} años`]);
  if (h.menopauseAge !== undefined) rows.push(["Menopausia", `${h.menopauseAge} años`]);
  if (h.familyBreastCancer !== undefined)
    rows.push(["Familiares con cáncer de mama", h.familyBreastCancer.length ? h.familyBreastCancer.join(", ") : "Ninguno"]);
  if (h.hpvVaccinated !== undefined) rows.push(["Vacuna VPH", yesNo(h.hpvVaccinated) + (h.hpvDoses ? ` (${h.hpvDoses} dosis)` : "")]);
  if (h.sexuallyActive !== undefined) rows.push(["Vida sexual activa", yesNo(h.sexuallyActive)]);
  if (h.sexualDebutAge !== undefined) rows.push(["Inicio de vida sexual", `${h.sexualDebutAge} años`]);
  return rows;
}

const toNum = (s: string) => (s.trim() === "" ? undefined : Number(s));
const yn = (v?: boolean): "si" | "no" | "" => (v === undefined ? "" : v ? "si" : "no");

export function VisitHistory({
  known, canSee, mode, draft, onConfirm, onEdit, onChange,
}: {
  known?: Autofilled<StableHistory>;
  canSee: boolean;
  mode: HistoryMode;
  draft: StableHistory;
  onConfirm: () => void;
  onEdit: () => void;
  onChange: (h: StableHistory) => void;
}) {
  if (!canSee) {
    return (
      <VisitGroup title="Antecedentes">
        <p className="flex items-center gap-sm rounded-md bg-surface-sunken p-md type-caption text-muted-foreground">
          <Lock className="size-5 shrink-0" aria-hidden="true" />
          •••• Oculto para tu rol. Los confirma el médico.
        </p>
      </VisitGroup>
    );
  }

  const set = (patch: Partial<StableHistory>) => onChange({ ...draft, ...patch });

  if (mode !== "edit" && known) {
    const pending = mode === "pending";
    return (
      <VisitGroup
        title="Antecedentes"
        hint="No cambian mucho: confírmalos con la paciente en lugar de volver a capturarlos."
        aside={pending ? <AutofillBadge source={known.source} /> : null}
      >
        <dl className={pending ? "grid gap-sm rounded-md border-l-4 border-autofill-border bg-autofill p-md text-on-autofill sm:grid-cols-2" : "grid gap-sm sm:grid-cols-2"}>
          {historyRows(mode === "confirmed" ? draft : known.value).map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="type-caption">{k}</dt>
              <dd className="type-body-strong">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center gap-sm">
          {pending ? (
            <Button type="button" variant="outline" onClick={onConfirm} id="vn-history-confirm">
              <Check aria-hidden="true" />
              Confirmar sin cambios
            </Button>
          ) : (
            <p className="flex items-center gap-xs type-caption text-muted-foreground">
              <Check className="size-4" aria-hidden="true" />
              Confirmados en esta visita
            </p>
          )}
          <Button type="button" variant="ghost" onClick={onEdit}>
            <Pencil aria-hidden="true" />
            Editar
          </Button>
        </div>
      </VisitGroup>
    );
  }

  return (
    <VisitGroup title="Antecedentes" hint={known ? "Corrige solo lo que cambió." : "Primera vez: captúralos una sola vez; en las siguientes visitas solo se confirman."}>
      <div className="grid gap-md sm:grid-cols-2">
        <VisitField id="vn-h-menarche" label="Edad de la menarca">
          <Input id="vn-h-menarche" inputMode="numeric" value={draft.menarcheAge ?? ""} onChange={(e) => set({ menarcheAge: toNum(e.target.value) })} />
        </VisitField>
        <VisitField id="vn-h-menopause" label="Edad de la menopausia (si aplica)">
          <Input id="vn-h-menopause" inputMode="numeric" value={draft.menopauseAge ?? ""} onChange={(e) => set({ menopauseAge: toNum(e.target.value) })} />
        </VisitField>
      </div>
      <VisitField id="vn-h-family" label="Familiares con cáncer de mama (separados por coma)">
        <Input
          id="vn-h-family"
          placeholder="Ej. madre, tía materna"
          value={(draft.familyBreastCancer ?? []).join(", ")}
          onChange={(e) => set({ familyBreastCancer: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
        />
      </VisitField>
      <div className="grid gap-md sm:grid-cols-2">
        <ChoiceGroup id="vn-h-hpv" name="vn-h-hpv" legend="¿Vacuna contra VPH?" value={yn(draft.hpvVaccinated)}
          options={[{ value: "si", label: "Sí" }, { value: "no", label: "No" }]} onChange={(v) => set({ hpvVaccinated: v === "si" })} />
        <ChoiceGroup id="vn-h-active" name="vn-h-active" legend="¿Vida sexual activa?" value={yn(draft.sexuallyActive)}
          options={[{ value: "si", label: "Sí" }, { value: "no", label: "No" }]} onChange={(v) => set({ sexuallyActive: v === "si" })} />
      </div>
      <VisitField id="vn-h-debut" label="Edad de inicio de vida sexual">
        <Input id="vn-h-debut" inputMode="numeric" value={draft.sexualDebutAge ?? ""} onChange={(e) => set({ sexualDebutAge: toNum(e.target.value) })} />
      </VisitField>
    </VisitGroup>
  );
}

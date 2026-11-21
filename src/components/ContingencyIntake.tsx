// ISS-0018: on "Nueva paciente", marks a record typed in from a paper contingency sheet.
import { FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizePaperFolio } from "@/domain/contingency";

export interface PaperIntake {
  fromPaper: boolean;
  paperFolio: string;
}

export const emptyPaperIntake = (): PaperIntake => ({ fromPaper: false, paperFolio: "" });

/** Error message, or undefined when valid (or not from paper). */
export function paperIntakeError(v: PaperIntake): string | undefined {
  if (!v.fromPaper) return undefined;
  return normalizePaperFolio(v.paperFolio) ? undefined : "Escribe el folio de papel tal como viene en la hoja, por ejemplo PA-0003.";
}

export function ContingencyIntake({ value, onChange, showError }: { value: PaperIntake; onChange: (v: PaperIntake) => void; showError: boolean }) {
  const error = showError ? paperIntakeError(value) : undefined;
  return (
    <div className="flex flex-col gap-sm rounded-md border border-dashed bg-muted p-md">
      <label className="flex min-h-control cursor-pointer items-center gap-md">
        <input type="checkbox" className="size-5 accent-primary" checked={value.fromPaper}
          onChange={(e) => onChange({ ...value, fromPaper: e.target.checked })} />
        <span className="flex items-center gap-sm type-label">
          <FileText className="size-5" aria-hidden="true" />
          Viene de hoja de contingencia (papel)
        </span>
      </label>
      {value.fromPaper && (
        <div className="flex flex-col gap-xs">
          <Label htmlFor="pn-paperFolio">Folio de papel</Label>
          <Input id="pn-paperFolio" autoComplete="off" className="type-folio" placeholder="PA-0003" value={value.paperFolio}
            onChange={(e) => onChange({ ...value, paperFolio: e.target.value })}
            aria-invalid={error ? true : undefined} aria-describedby={error ? "pn-paperFolio-error" : undefined} />
          {error && <p id="pn-paperFolio-error" className="type-caption text-danger">{error}</p>}
          <p className="type-caption text-muted-foreground">Queda en el expediente como “Capturada desde hoja de papel” y se puede buscar por ese folio.</p>
        </div>
      )}
    </div>
  );
}

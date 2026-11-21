// Match card (design/DESIGN.md "Match card"): who, why it matches, and a human decision. Never merges.
import { forwardRef } from "react";
import { Check, Minus, MapPin, UserCheck, UserX, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isFinalFolio } from "@/domain/factory";
import { cn } from "@/lib/utils";
import type { MatchCandidate } from "@/domain/matching";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function ageFrom(birthDate: string, today = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  let age = today.getFullYear() - y;
  if (today.getMonth() < mo || (today.getMonth() === mo && today.getDate() < d)) age--;
  return age;
}

function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso;
}

export function FolioTag({ folio, provisionalFolio }: { folio: string; provisionalFolio?: string }) {
  const final = isFinalFolio(folio);
  return (
    <span className="flex flex-col items-end gap-xs">
      <span
        className={cn(
          "rounded-md border px-sm type-folio",
          final
            ? "border-border bg-card text-foreground"
            : "border-dashed border-warning-border bg-warning-subtle text-on-warning-subtle",
        )}
      >
        {folio}
        {!final && <span className="sr-only"> (provisional)</span>}
      </span>
      {!final ? (
        <span className="type-caption text-on-warning-subtle">provisional</span>
      ) : (
        provisionalFolio && provisionalFolio !== folio && (
          <span className="type-caption text-muted-foreground">antes {provisionalFolio}</span>
        )
      )}
    </span>
  );
}

/** Reasons that speak against the match ("Fecha de nacimiento distinta", "Otro municipio (…)"). */
const isAgainst = (reason: string) => /distint|^Otro /i.test(reason);

interface MatchCardProps {
  patient: MatchCandidate;
  /** Spanish reasons from matching.ts, strongest first. */
  reasons: string[];
  dismissed: boolean;
  /** Extra note, e.g. "Ya confirmada como otra persona que …". */
  note?: string;
  onSame: () => void;
  onOther: () => void;
  onUndo: () => void;
}

export const MatchCard = forwardRef<HTMLButtonElement, MatchCardProps>(function MatchCard(
  { patient, reasons, dismissed, note, onSame, onOther, onUndo },
  primaryRef,
) {
  const { identity } = patient;
  const age = ageFrom(identity.birthDate);
  const titleId = `match-${patient.patientId}`;

  if (dismissed) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-md rounded-xl border border-dashed bg-muted px-lg py-md">
        <span className="flex items-center gap-sm text-muted-foreground">
          <UserX className="size-5" aria-hidden="true" />
          <span><span className="type-body-strong">{identity.fullName}</span> · marcada como otra persona</span>
        </span>
        <Button variant="ghost" onClick={onUndo}><Undo2 aria-hidden="true" />Deshacer</Button>
      </li>
    );
  }

  return (
    <li aria-labelledby={titleId} className="flex flex-col gap-md rounded-xl border bg-card p-lg shadow-sm">
      <div className="flex items-start justify-between gap-md">
        <div className="flex flex-col gap-xs">
          <h2 id={titleId} className="type-body-strong">{identity.fullName}</h2>
          <p className="flex flex-wrap items-center gap-x-md gap-y-xs type-caption text-muted-foreground">
            <span>{age !== null ? `${age} años` : "Edad desconocida"} · nació el {formatDate(identity.birthDate)}</span>
            <span className="flex items-center gap-xs">
              <MapPin className="size-4" aria-hidden="true" />
              {identity.residence ? `${identity.residence}, ` : ""}{identity.municipality}
            </span>
          </p>
        </div>
        <FolioTag folio={patient.folio} provisionalFolio={patient.provisionalFolio} />
      </div>

      <div className="flex flex-col gap-sm rounded-md bg-muted p-md">
        <h3 className="type-label">Por qué coincide</h3>
        <ul className="flex flex-col gap-xs">
          {reasons.map((r) => (
            <li key={r} className={cn("flex items-center gap-sm", isAgainst(r) && "text-muted-foreground")}>
              {isAgainst(r)
                ? <Minus className="size-5 shrink-0" aria-hidden="true" />
                : <Check className="size-5 shrink-0 text-success" aria-hidden="true" />}
              {r}
            </li>
          ))}
        </ul>
        {note && <p className="type-caption text-muted-foreground">{note}</p>}
      </div>

      <div className="flex flex-wrap gap-sm">
        <Button ref={primaryRef} onClick={onSame} data-match-primary>
          <UserCheck aria-hidden="true" />Es la misma persona
        </Button>
        <Button variant="outline" onClick={onOther}>
          <UserX aria-hidden="true" />Es otra persona
        </Button>
      </div>
    </li>
  );
});

// ISS-0020: "Conflictos". Two laptops changed the same field offline from the same starting value.
// Shows every competing value with who, where and when; "Conservar este valor" appends a new
// field.updated whose prev is the current head (rule in src/domain/conflicts.ts). Nothing is lost.
// Mount points: <ConflictPanel /> (sync screen, all records) or <ConflictPanel patientId=... />.
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Laptop, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_USERS, ROLE_LABEL, canSeeSensitive, useSession } from "@/app/session";
import { useDevice } from "@/app/useDevice";
import { useRecords, type RecordsSource } from "@/app/useRecords";
import { conflictsOf, fieldLabel, formatValue, isSensitiveField, openConflicts, resolveConflict, type FieldConflict } from "@/domain/conflicts";
import type { FieldChange, PatientRecord } from "@/domain/projection";
import { cn } from "@/lib/utils";
import { RoleLocked } from "./RoleSensitive";

const authorName = (id: string) => DEMO_USERS.find((u) => u.id === id)?.name ?? id;

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const month = d.toLocaleDateString("es-MX", { month: "short" }).replace(".", "");
  const time = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${d.getDate()} ${month} ${d.getFullYear()}, ${time}`;
}

function ContenderOption({
  change,
  current,
  hidden,
  busy,
  onKeep,
}: {
  change: FieldChange;
  current: boolean;
  hidden: boolean;
  busy: boolean;
  onKeep?: () => void;
}) {
  return (
    <div className="flex flex-col gap-sm rounded-card border bg-surface-raised p-md">
      {hidden ? <RoleLocked label="Valor" /> : <span className="type-body-strong">{formatValue(change.value)}</span>}
      <span className="flex flex-wrap items-center gap-xs type-caption text-muted-foreground">
        <Laptop aria-hidden="true" className="size-4" />
        Equipo {change.device} · {authorName(change.author)} ({ROLE_LABEL[change.role]}) · {formatDateTime(change.at)}
      </span>
      {current && <span className="type-caption text-muted-foreground">Se muestra ahora por ser el más reciente.</span>}
      {onKeep && (
        <Button variant="outline" className="self-start" disabled={busy} onClick={onKeep}>
          <Check aria-hidden="true" />Conservar este valor
        </Button>
      )}
    </div>
  );
}

function ConflictCard({ conflict, record, source }: { conflict: FieldConflict; record: PatientRecord; source?: RecordsSource }) {
  const { user, jornadaId } = useSession();
  const { append } = useRecords(source);
  const device = useDevice();
  const [busy, setBusy] = useState(false);
  const hidden = isSensitiveField(conflict.field) && !(user && canSeeSensitive(user.role));

  async function keep(chosen: FieldChange) {
    if (!user || busy) return;
    setBusy(true);
    try {
      await append([resolveConflict(conflict, chosen, { device, author: user.id, role: user.role, jornadaId })]);
      toast.success(`${fieldLabel(conflict.field)} actualizado. El otro valor queda en el historial.`);
    } catch {
      toast.error("No se pudo guardar la decisión. Intenta de nuevo.");
      setBusy(false);
    }
  }

  return (
    <Card className="border-danger-border">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-sm type-heading">
          <TriangleAlert aria-hidden="true" className="size-5 text-on-danger-subtle" />
          {fieldLabel(conflict.field)} de {record.identity.fullName || "paciente sin nombre"}
          <span className="type-folio text-muted-foreground">{record.folio}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-md">
        <p className="type-body">Se cambió en dos equipos sin red. Elige el valor correcto; el otro queda en el historial.</p>
        <div className="grid gap-md md:grid-cols-2">
          {conflict.contenders.map((c) => (
            <ContenderOption
              key={c.eventId}
              change={c}
              current={c.eventId === conflict.head.eventId}
              hidden={hidden}
              busy={busy}
              onKeep={user && !hidden ? () => keep(c) : undefined}
            />
          ))}
        </div>
        {hidden && <p className="type-caption text-muted-foreground">Solo personal médico puede resolver este dato.</p>}
      </CardContent>
    </Card>
  );
}

export function ConflictPanel({ patientId, className, source }: { patientId?: string; className?: string; source?: RecordsSource }) {
  const { model } = useRecords(source);
  const conflicts = useMemo(() => {
    if (!patientId) return openConflicts(model);
    const record = model.patients[patientId];
    return record ? conflictsOf(record) : [];
  }, [model, patientId]);

  if (conflicts.length === 0) return null;
  return (
    <section aria-labelledby="conflicts-title" className={cn("flex flex-col gap-md", className)}>
      <h2 id="conflicts-title" className="flex items-center gap-sm type-heading text-on-danger-subtle">
        <TriangleAlert aria-hidden="true" className="size-5" />
        Conflictos ({conflicts.length})
      </h2>
      {conflicts.map((c) => (
        <ConflictCard key={`${c.patientId}|${c.field}`} conflict={c} record={model.patients[c.patientId]} source={source} />
      ))}
    </section>
  );
}

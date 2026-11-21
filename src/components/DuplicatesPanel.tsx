// ISS-0012 (UI): "Posibles duplicados". After a sync pull, two offline laptops may have registered
// the same person. Lists link proposals (src/domain/duplicates.ts) with the reasons and both
// identities side by side; a human decides (EIRA limit: never merge without confirmation):
// "Vincular (misma persona)" -> patients.linked, "Son personas distintas" -> patients.marked_distinct.
// Mount point: <DuplicatesPanel /> (renders nothing when there are no proposals).
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Link2, Users, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/app/session";
import { useRecords, type RecordsSource } from "@/app/useRecords";
import { confirmLink, findDuplicateProposals, rejectLink, type LinkProposal } from "@/domain/duplicates";
import { isFinalFolio } from "@/domain/factory";
import type { PatientRecord } from "@/domain/projection";
import { cn } from "@/lib/utils";
import { useDevice } from "@/app/useDevice";
import { formatPhone } from "./PatientContact";

const AFFILIATION_LABEL: Record<string, string> = { ninguno: "Ninguna", otro: "Otra", INSABI: "INSABI / IMSS-Bienestar" };

function formatBirth(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return m ? `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}` : iso || "Sin registro";
}

/** Folio EIRA per DESIGN.md: final = solid border; provisional = dashed warning + the word "provisional". */
export function DuplicatesFolio({ record }: { record: Pick<PatientRecord, "folio" | "provisionalFolio" | "finalFolio"> }) {
  const final = record.finalFolio && isFinalFolio(record.finalFolio);
  if (final) {
    return (
      <span className="flex flex-wrap items-center gap-sm">
        <span className="type-folio rounded-control border border-border bg-surface-raised px-sm py-xs">{record.finalFolio}</span>
        {record.provisionalFolio && (
          <span className="type-caption text-muted-foreground">antes {record.provisionalFolio}</span>
        )}
      </span>
    );
  }
  return (
    <span className="type-folio inline-flex items-center gap-sm rounded-control border border-dashed border-warning-border bg-warning-subtle px-sm py-xs text-on-warning-subtle">
      {record.folio || "Sin folio"}
      <span className="type-caption">provisional</span>
    </span>
  );
}

function IdentityColumn({ record, role }: { record: PatientRecord; role: string }) {
  const id = record.identity;
  const rows: Array<[string, string]> = [
    ["Fecha de nacimiento", formatBirth(id.birthDate)],
    ["Entidad de nacimiento", id.birthState || "Sin registro"],
    ["Municipio", id.municipality || "Sin registro"],
    ["Residencia habitual", id.residence || "Sin registro"],
    ["Teléfono", id.phone ? formatPhone(id.phone) : "Sin registro"],
    ["Afiliación", AFFILIATION_LABEL[id.affiliation] ?? id.affiliation],
    ["Registrada en", record.created ? `Laptop ${record.created.device}` : "Sin registro"],
  ];
  return (
    <div className="flex flex-col gap-sm rounded-card border bg-surface-raised p-md" aria-label={`${role}: ${id.fullName}`}>
      <span className="type-caption text-muted-foreground">{role}</span>
      <span className="type-body-strong">{id.fullName || "Sin nombre"}</span>
      <DuplicatesFolio record={record} />
      <dl className="flex flex-col gap-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-wrap gap-sm">
            <dt className="type-caption text-muted-foreground">{label}:</dt>
            <dd className="type-caption">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ProposalCard({ proposal, survivor, alias, source }: { proposal: LinkProposal; survivor: PatientRecord; alias: PatientRecord; source?: RecordsSource }) {
  const { user, jornadaId } = useSession();
  const { append } = useRecords(source);
  const device = useDevice();
  const [busy, setBusy] = useState(false);

  async function decide(kind: "link" | "distinct") {
    if (!user || busy) return;
    setBusy(true);
    const actor = { device, author: user.id, role: user.role, jornadaId };
    try {
      await append([kind === "link" ? confirmLink(proposal, actor) : rejectLink(proposal, actor)]);
      toast.success(
        kind === "link"
          ? `Expedientes vinculados. ${alias.folio} ahora lleva al expediente ${survivor.folio}.`
          : "Marcadas como personas distintas. No se volverán a proponer.",
      );
    } catch {
      toast.error("No se pudo guardar la decisión. Intenta de nuevo.");
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-md">
        <div className="grid gap-md md:grid-cols-2">
          <IdentityColumn record={survivor} role="Se conserva" />
          <IdentityColumn record={alias} role="Se vincula a la anterior" />
        </div>
        <div className="flex flex-col gap-xs">
          <span className="type-label">Por qué coincide</span>
          <ul className="flex flex-col gap-xs">
            {proposal.reasons.map((r) => (
              <li key={r} className="flex items-center gap-sm type-body">
                <Check aria-hidden="true" className="size-5 shrink-0 text-on-success-subtle" />
                {r}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-sm">
          <Button disabled={busy || !user} onClick={() => decide("link")}>
            <Link2 aria-hidden="true" />Vincular (misma persona)
          </Button>
          <Button variant="outline" disabled={busy || !user} onClick={() => decide("distinct")}>
            <UserX aria-hidden="true" />Son personas distintas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DuplicatesPanel({ className, source }: { className?: string; source?: RecordsSource }) {
  const { model } = useRecords(source);
  const proposals = useMemo(() => {
    const records = model.activeIds.map((id) => model.patients[id]);
    return findDuplicateProposals(records);
  }, [model]);

  if (proposals.length === 0) return null;
  return (
    <section aria-labelledby="duplicates-title" className={cn("flex flex-col gap-md", className)}>
      <Card className="border-warning-border bg-warning-subtle">
        <CardHeader>
          <CardTitle>
            <h2 id="duplicates-title" className="flex items-center gap-sm type-heading text-on-warning-subtle">
              <Users aria-hidden="true" className="size-5" />
              Posibles duplicados ({proposals.length})
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="type-body text-on-warning-subtle">
          Estas pacientes se registraron en laptops distintas sin red y se parecen mucho. Revisa los datos y decide;
          nada se une sin tu confirmación.
        </CardContent>
      </Card>
      {proposals.map((p) => (
        <ProposalCard
          key={`${p.survivorId}|${p.aliasId}`}
          proposal={p}
          survivor={model.patients[p.survivorId]}
          alias={model.patients[p.aliasId]}
          source={source}
        />
      ))}
    </section>
  );
}

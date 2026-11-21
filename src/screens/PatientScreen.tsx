// Patient record: identity + folio header, primary "Nueva visita" (ISS-0010), contact with history and
// timeline (ISS-0011), and the role-gated clinical panel with results (ISS-0013).
import { useMemo, useState, type ReactNode } from "react";
import {
  CalendarPlus, ChevronDown, ClipboardList, FileCheck2, Hash, HeartPulse, IdCard, Link2, MapPin, Pencil,
  Search, ShieldAlert, ShieldCheck, Stethoscope, UserPlus, UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PatientContact, authorName, formatDateTime } from "@/components/PatientContact";
import { RoleClinicalPanel } from "@/components/RoleClinicalPanel";
import { ConflictBadge } from "@/components/ConflictBadge";
import { VisitNewButton } from "@/components/VisitNewButton";
import { CartillaButton } from "@/components/CartillaCard";
import { useNavigation } from "@/app/navigation";
import { useRecords } from "@/app/useRecords";
import type { Affiliation, EventType } from "@/domain/events";
import { isFinalFolio } from "@/domain/factory";
import { isSeedFolio } from "@/domain/seed";
import { ageOn } from "@/domain/identity";
import { eiraKey } from "@/domain/matching";
import { resolvePatient, type PatientRecord, type TimelineEntry } from "@/domain/projection";
import { cn } from "@/lib/utils";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const formatDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso;
};

const AFFILIATION: Record<Affiliation, string> = {
  INSABI: "INSABI / IMSS-Bienestar", IMSS: "IMSS", ISSSTE: "ISSSTE", PEMEX: "PEMEX",
  SEDENA: "SEDENA", SEMAR: "SEMAR", ninguno: "Ninguna", otro: "Otra",
};

const TIMELINE_ICON: Partial<Record<EventType, typeof Hash>> = {
  "patient.created": UserPlus,
  "privacy.accepted": ShieldCheck,
  "field.updated": Pencil,
  "history.confirmed": ClipboardList,
  "visit.recorded": CalendarPlus,
  "service.recorded": Stethoscope,
  "result.recorded": FileCheck2,
  "folio.assigned": Hash,
  "patients.linked": Link2,
  "patients.marked_distinct": UserX,
};

export function PatientScreen({ patientId }: { patientId: string }) {
  const { model, version } = useRecords();
  const { go } = useNavigation();
  const requested = model.patients[patientId];
  const record = resolvePatient(model, patientId);

  if (!record || !record.complete) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col items-start gap-md">
        <h1 className="type-title">Expediente</h1>
        <p className="text-muted-foreground">
          {version === 0 ? "Cargando expediente…" : "No encontramos este expediente en esta laptop. Puede llegar al sincronizar."}
        </p>
        {version > 0 && (
          <Button variant="outline" onClick={() => go({ name: "search" })}><Search aria-hidden="true" />Buscar paciente</Button>
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-lg">
      {requested && requested.patientId !== record.patientId && (
        <p role="status" className="flex items-center gap-sm rounded-md border bg-secondary p-md text-secondary-foreground">
          <Link2 className="size-5 shrink-0" aria-hidden="true" />
          El folio {requested.folio} se vinculó con este expediente. Ves el expediente unificado.
        </p>
      )}
      <PatientHeader record={record} />
      <div className="grid gap-lg lg:grid-cols-3">
        <aside className="flex flex-col gap-lg" aria-label="Datos de la paciente">
          <IdentityCard record={record} />
          <PatientContact record={record} />
        </aside>
        <div className="flex flex-col gap-lg lg:col-span-2">
          <Timeline entries={record.timeline} />
          <section aria-labelledby="clinical-title" className="flex flex-col gap-md">
            <h2 id="clinical-title" className="flex items-center gap-sm type-heading">
              <HeartPulse className="size-5" aria-hidden="true" />Antecedentes, servicios y resultados
            </h2>
            <RoleClinicalPanel patientId={record.patientId} />
          </section>
        </div>
      </div>
    </section>
  );
}

function PatientHeader({ record }: { record: PatientRecord }) {
  const age = ageOn(record.identity.birthDate);
  const final = isFinalFolio(record.folio);
  return (
    <header className="flex flex-wrap items-start justify-between gap-md">
      <div className="flex flex-col gap-xs">
        <h1 className="type-title">{record.identity.fullName}</h1>
        <p className="flex flex-wrap items-center gap-x-md gap-y-xs text-muted-foreground">
          <span>{age !== null ? `${age} años` : "Edad desconocida"}</span>
          <span className="flex items-center gap-xs">
            <MapPin className="size-4" aria-hidden="true" />
            {record.identity.residence ? `${record.identity.residence}, ` : ""}{record.identity.municipality}
          </span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-md">
        <div
          className={cn(
            "flex items-center gap-sm rounded-md px-md py-sm",
            final
              ? "border border-border bg-card"
              : "border-2 border-dashed border-warning-border bg-warning-subtle text-on-warning-subtle",
          )}
          aria-label={`Folio ${final ? "definitivo" : "provisional"} ${record.folio}`}
        >
          <Hash className="size-5" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="type-folio">{record.folio}</span>
            <span className="type-caption">
              {final ? (record.provisionalFolio && !isSeedFolio(record.provisionalFolio) ? `antes ${record.provisionalFolio}` : "definitivo") : "provisional: se confirma al conectarse"}
            </span>
          </div>
        </div>
        <ConflictBadge patientId={record.patientId} />
        <CartillaButton record={record} />
        <VisitNewButton patientId={record.patientId} />
      </div>
    </header>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="type-caption text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function IdentityCard({ record }: { record: PatientRecord }) {
  const { identity, privacy } = record;
  return (
    <section aria-labelledby="identity-title" className="flex flex-col gap-md rounded-xl border bg-card p-lg shadow-sm">
      <h2 id="identity-title" className="flex items-center gap-sm type-heading">
        <IdCard className="size-5" aria-hidden="true" />Identidad
      </h2>
      <dl className="grid gap-md sm:grid-cols-2 lg:grid-cols-1">
        <Row label="Fecha de nacimiento">{formatDate(identity.birthDate)}</Row>
        <Row label="Entidad de nacimiento">{identity.birthState || "Sin registro"}</Row>
        <Row label="Afiliación">
          {AFFILIATION[identity.affiliation]}
          {identity.affiliationNumber && <span className="text-muted-foreground"> · {identity.affiliationNumber}</span>}
        </Row>
        <Row label="Clave EIRA">
          <span className="type-folio">{eiraKey(identity)}</span>
          <span className="block type-caption text-muted-foreground">Calculada del nombre y la fecha; puede repetirse entre personas.</span>
        </Row>
        <Row label="Cartilla EIRA">{identity.hasCartilla ? "Sí cuenta con ella" : "No cuenta con ella"}</Row>
      </dl>
      {privacy ? (
        <p className="flex items-center gap-sm rounded-md bg-success-subtle p-sm type-caption text-on-success-subtle">
          <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
          Aviso de privacidad aceptado el {formatDate(privacy.acceptedOn)} (versión {privacy.noticeVersion})
        </p>
      ) : (
        <p className="flex items-center gap-sm rounded-md bg-warning-subtle p-sm type-caption text-on-warning-subtle">
          <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
          No hay aviso de privacidad registrado. Pídeselo en la próxima visita.
        </p>
      )}
    </section>
  );
}

const TIMELINE_PREVIEW = 5;

function Timeline({ entries }: { entries: TimelineEntry[] }) {
  const [all, setAll] = useState(false);
  // Newest first; on equal timestamps the registration stays the oldest entry.
  const items = useMemo(
    () => [...entries].reverse().sort((a, b) =>
      a.at !== b.at ? (a.at < b.at ? 1 : -1) : Number(a.type === "patient.created") - Number(b.type === "patient.created")),
    [entries],
  );
  return (
    <section aria-labelledby="timeline-title" className="flex flex-col gap-md rounded-xl border bg-card p-lg shadow-sm">
      <h2 id="timeline-title" className="flex items-center gap-sm type-heading">
        <ClipboardList className="size-5" aria-hidden="true" />Historial del expediente
      </h2>
      <p className="type-caption text-muted-foreground">Todo lo que pasó, del más reciente al primero. Nada se borra.</p>
      <ol className="flex flex-col">
        {(all ? items : items.slice(0, TIMELINE_PREVIEW)).map((e) => {
          const Icon = TIMELINE_ICON[e.type] ?? Hash;
          return (
            <li key={e.eventId} className="flex gap-md border-l-2 pb-md pl-md last:pb-0">
              <Icon className="mt-xs size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="flex flex-col">
                <span>{e.label}</span>
                <span className="type-caption text-muted-foreground">
                  {formatDateTime(e.at)} · {authorName(e.author)} · laptop {e.device}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      {items.length > TIMELINE_PREVIEW && (
        <Button variant="ghost" className="self-start" aria-expanded={all} onClick={() => setAll((v) => !v)}>
          <ChevronDown aria-hidden="true" className={cn("transition-transform", all && "rotate-180")} />
          {all ? "Ver menos" : `Ver todo (${items.length})`}
        </Button>
      )}
    </section>
  );
}

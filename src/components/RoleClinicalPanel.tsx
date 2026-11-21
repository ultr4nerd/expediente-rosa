// ISS-0013: clinical part of a patient's record, filtered by the simulated role.
// - capturista: identity/contact live elsewhere; here sensitive history, service fields and
//   results show a locked placeholder ("Visible solo para personal médico").
// - medico/admin: everything, sensitive history behind an explicit "Mostrar".
// - patologo: service fields and results (needs them to report), not the sexual history.
// - patologo/medico: record or correct a result per service (`result.recorded`).
// Mount point: <RoleClinicalPanel patientId={...} /> in the patient screen.
import { useState } from "react";
import { FlaskConical, Pencil, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { canSeeSensitive, useSession } from "@/app/session";
import { useRecords } from "@/app/useRecords";
import type { CitologiaFields, MamaFields, Role, StableHistory } from "@/domain/events";
import { resolvePatient, type ServiceRecord, type VisitRecord } from "@/domain/projection";
import { canRecordResult, canSeeClinical } from "@/domain/results";
import { DataRow, RoleLocked, RoleSensitive } from "./RoleSensitive";
import { ResultForm } from "./ResultForm";
import { ResultView, formatDate } from "./ResultView";

const yesNo = (v?: boolean) => (v === undefined ? undefined : v ? "Sí" : "No");
const list = (v?: string[]) => (v && v.length ? v.join(", ") : undefined);

const CITOLOGY_KIND: Record<CitologiaFields["citologyKind"], string> = {
  primera_vez: "Primera vez en la vida",
  primera_vez_3_anios: "Primera vez después de 3 años",
  subsecuente: "Subsecuente",
  complementaria_vph: "Complementaria VPH",
};

export function RoleClinicalPanel({ patientId }: { patientId: string }) {
  const { user } = useSession();
  const { model } = useRecords();
  const record = resolvePatient(model, patientId);
  if (!user || !record) return null;
  const role = user.role;

  return (
    <div className="flex flex-col gap-lg">
      <RoleHistory history={record.history} role={role} />
      {record.visits.length === 0 ? (
        <p className="type-body text-muted-foreground">Aún no hay visitas con servicios para esta paciente.</p>
      ) : (
        [...record.visits].reverse().map((v) => <VisitServices key={v.visitId} visit={v} role={role} />)
      )}
    </div>
  );
}

export function RoleHistory({ history, role }: { history: StableHistory; role: Role }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="type-heading">Antecedentes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-md">
        <dl className="grid gap-md sm:grid-cols-2">
          <DataRow label="Menarca (edad)" value={history.menarcheAge} />
          <DataRow label="Menopausia (edad)" value={history.menopauseAge} />
          <DataRow label="Familiares con cáncer de mama" value={list(history.familyBreastCancer)} />
          <DataRow label="Vacuna VPH" value={yesNo(history.hpvVaccinated)} />
        </dl>
        <RoleSensitive allowed={canSeeSensitive(role)} label="Antecedentes gineco-obstétricos sensibles">
          <dl className="grid gap-md sm:grid-cols-2">
            <DataRow label="Vida sexual activa" value={yesNo(history.sexuallyActive)} />
            <DataRow label="Inicio de vida sexual (edad)" value={history.sexualDebutAge} />
          </dl>
        </RoleSensitive>
      </CardContent>
    </Card>
  );
}

function VisitServices({ visit, role }: { visit: VisitRecord; role: Role }) {
  if (visit.services.length === 0) return null;
  return (
    <section className="flex flex-col gap-md" aria-label={`Visita del ${formatDate(visit.date)}`}>
      <h2 className="type-heading">Visita del {formatDate(visit.date)} · {visit.site}</h2>
      {visit.services.map((s) => <ServiceCard key={s.serviceId} service={s} role={role} />)}
    </section>
  );
}

export function ServiceCard({ service, role }: { service: ServiceRecord; role: Role }) {
  const [editing, setEditing] = useState(false);
  const cito = service.serviceType === "citologia";
  const Icon = cito ? FlaskConical : Stethoscope;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-sm type-heading">
          <Icon aria-hidden="true" className="size-5" />
          {cito ? "Citología" : "Revisión mamaria"}
          {service.cytologyNumber && <span className="type-folio text-muted-foreground">N.º {service.cytologyNumber}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-md">
        {canSeeClinical(role) ? <ServiceFields service={service} /> : <RoleLocked label="Datos clínicos del servicio" />}
        <Separator />
        {editing ? (
          <ResultForm service={service} onDone={() => setEditing(false)} />
        ) : (
          <div className="flex flex-col gap-sm">
            <ResultView service={service} role={role} />
            {canRecordResult(role) && (
              <Button variant={service.result ? "outline" : "default"} className="self-start" onClick={() => setEditing(true)}>
                <Pencil aria-hidden="true" />{service.result ? "Corregir resultado" : "Registrar resultado"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ServiceFields({ service }: { service: ServiceRecord }) {
  if (service.serviceType === "citologia") {
    const f = service.fields as CitologiaFields;
    return (
      <dl className="grid gap-md sm:grid-cols-2">
        <DataRow label="Tipo de citología" value={CITOLOGY_KIND[f.citologyKind] ?? f.citologyKind} />
        <DataRow label="Estado gineco-obstétrico" value={list(f.gynecoObstetricStatus)} />
        <DataRow label="Fecha de última menstruación" value={f.lastMenstrualPeriod} />
        <DataRow label="Observación del cérvix" value={list(f.cervixObservation)} />
        <DataRow label="Factores de riesgo" value={list(f.riskFactors)} />
        <DataRow label="Muestra repetida" value={yesNo(f.repeatedSample)} />
        <DataRow label="Número citológico anterior" value={f.previousCytologyNumber} />
        <DataRow label="Cédula de quien toma la muestra" value={service.takenByLicense} />
      </dl>
    );
  }
  const f = service.fields as MamaFields;
  return (
    <dl className="grid gap-md sm:grid-cols-2">
      <DataRow label="Motivo de consulta" value={f.consultReason} />
      <DataRow label="Mastografía previa" value={yesNo(f.previousMammogram)} />
      <DataRow label="Fecha de última mastografía" value={f.lastMammogramDate} />
      <DataRow label="Resultado de última mastografía" value={f.lastMammogramResult} />
      <DataRow label="Exploración clínica" value={f.clinicalExam} />
      <DataRow label="Termografía" value={f.thermography === "asimetrico" ? "Asimétrica" : f.thermography === "simetrico" ? "Simétrica" : undefined} />
      <DataRow label="Notas de ultrasonido" value={f.ultrasoundNotes} />
    </dl>
  );
}

import { RoleClinicalPanel } from "@/components/RoleClinicalPanel";

// TODO(ISS-0011): timeline, contact change with history. Spec: docs/specs/mvp-expediente-rosa.md.
import { VisitNewButton } from "@/components/VisitNewButton";

export function PatientScreen({ patientId }: { patientId: string }) {
  return (
    <section className="flex flex-col gap-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <h1 className="type-title">Expediente</h1>
        <VisitNewButton patientId={patientId} />
      </div>
      <p className="text-muted-foreground">Expediente {patientId.slice(0, 8)} en construcción.</p>
      <RoleClinicalPanel patientId={patientId} />
    </section>
  );
}

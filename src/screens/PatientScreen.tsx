// TODO(ISS-0011): timeline, contact change with history. Spec: docs/specs/mvp-expediente-rosa.md.
export function PatientScreen({ patientId }: { patientId: string }) {
  return (
    <section className="flex flex-col gap-md">
      <h1 className="type-title">Expediente</h1>
      <p className="text-muted-foreground">Expediente {patientId.slice(0, 8)} en construcción.</p>
    </section>
  );
}

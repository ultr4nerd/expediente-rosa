// TODO(ISS-0010): implement. Spec: docs/specs/mvp-expediente-rosa.md; UI rules: design/DESIGN.md.
export function VisitNewScreen({ patientId }: { patientId: string }) {
  return (
    <section className="flex flex-col gap-md">
      <h1 className="type-title">Nueva visita</h1>
      <p className="text-muted-foreground">Visita para {patientId.slice(0, 8)} en construcción.</p>
    </section>
  );
}

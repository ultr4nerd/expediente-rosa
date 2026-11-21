import { DuplicatesPanel } from "@/components/DuplicatesPanel";
import { BackupPanel } from "@/components/BackupPanel";

// TODO(ISS-0006): implement. Spec: docs/specs/mvp-expediente-rosa.md; UI rules: design/DESIGN.md.
export function SyncScreen() {
  return (
    <section className="flex flex-col gap-md">
      <h1 className="type-title">Sincronización</h1>
      <p className="text-muted-foreground">Pantalla en construcción.</p>
      <DuplicatesPanel />
      <BackupPanel />
    </section>
  );
}

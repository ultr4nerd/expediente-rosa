// ISS-0017: JSON backup and restore of the whole event log, on the sync screen.
import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FolderOpen, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recordsSource } from "@/app/useRecords";
import { backupFileName, createBackup, parseBackup } from "@/domain/backup";
import { countsByMonthSiteService, countsCsv } from "@/domain/csvExport";
import { project } from "@/domain/projection";
import { platform } from "@/platform";
import { currentDevice, saveTextFile } from "@/platform/files";

export function BackupPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    try {
      const device = await currentDevice();
      const { events } = await platform.store.list(0);
      const now = new Date();
      const path = await saveTextFile(backupFileName(device, now), JSON.stringify(createBackup(events, device, now)), "application/json");
      setSavedPath(path ?? null);
      toast.success(path ? `Respaldo guardado con ${events.length} registros.` : `Respaldo descargado con ${events.length} registros.`);
    } catch {
      toast.error("No se pudo guardar el respaldo. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv() {
    setBusy(true);
    try {
      const device = await currentDevice();
      const { events } = await platform.store.list(0);
      const rows = countsByMonthSiteService(project(events));
      const path = await saveTextFile(backupFileName(device, new Date(), "csv", "conteos"), countsCsv(rows), "text/csv;charset=utf-8");
      setSavedPath(path ?? null);
      toast.success(`Conteos exportados: ${rows.length} filas, sin datos personales.`);
    } catch {
      toast.error("No se pudieron exportar los conteos. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function restore(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const parsed = parseBackup(await file.text());
      if (!parsed.ok) {
        toast.error(parsed.error);
        return;
      }
      const added = await recordsSource().append(parsed.events);
      const existing = parsed.events.length - added;
      toast.success(
        `Respaldo restaurado: ${added} registros nuevos, ${existing} ya estaban en esta laptop.` +
          (parsed.skipped ? ` ${parsed.skipped} no se pudieron leer.` : ""),
      );
    } catch {
      toast.error("No se pudo restaurar el respaldo. Revisa que sea el archivo correcto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="backup-title" className="flex flex-col gap-md rounded-xl border bg-card p-lg shadow-sm">
      <div className="flex flex-col gap-xs">
        <h2 id="backup-title" className="type-heading">Respaldo y exportación</h2>
        <p className="type-caption text-muted-foreground">
          Guarda todo el expediente de esta laptop en un archivo. Si la laptop falla, restáuralo en otra: no se duplica nada.
        </p>
      </div>
      <div className="flex flex-wrap gap-sm">
        <Button type="button" variant="outline" onClick={download} disabled={busy}>
          <Download aria-hidden="true" />
          Descargar respaldo
        </Button>
        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Upload aria-hidden="true" />
          Restaurar respaldo
        </Button>
        <Button type="button" variant="outline" onClick={exportCsv} disabled={busy}>
          <FileSpreadsheet aria-hidden="true" />
          Exportar conteos (CSV)
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={restore} />
      </div>
      {savedPath && (
        <p role="status" className="flex items-start gap-sm rounded-md bg-muted p-sm type-caption">
          <FolderOpen className="size-4 shrink-0" aria-hidden="true" />
          <span>
            Guardado en <span className="break-all font-semibold select-all">{savedPath}</span>
          </span>
        </p>
      )}
      <p className="type-caption text-muted-foreground">
        El respaldo contiene datos personales y clínicos: guárdalo solo en una memoria de EIRA. Los conteos (CSV) solo
        traen totales por mes, sede y servicio: sin nombres, teléfonos, folios ni resultados.
      </p>
    </section>
  );
}

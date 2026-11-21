// ISS-0018: printable contingency sheets (identity block + visit basics) with paper folios pre-filled,
// for when a laptop fails mid-jornada. Opens as a full-page overlay; "Imprimir" uses window.print(),
// which works in every Tauri webview. Print styles: only the sheets are printed, one per page.
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { PrintOverlay } from "@/components/PrintOverlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/app/session";
import { nextPaperFolios } from "@/domain/contingency";
import { PRIVACY_NOTICE_VERSION } from "@/domain/identity";
import { isTauri, platform } from "@/platform";
import { deviceInfo } from "@/platform/tauri";

async function currentDevice(): Promise<string> {
  if (!isTauri) return "A";
  try {
    return (await deviceInfo()).device || "A";
  } catch {
    return "A";
  }
}

const AFFILIATIONS = ["INSABI / IMSS-Bienestar", "IMSS", "ISSSTE", "PEMEX", "SEDENA", "SEMAR", "Ninguna", "Otra"];
const storageKey = (device: string) => `er.contingency.lastPrinted.${device}`;

function readLastPrinted(device: string): number {
  try {
    return Number(localStorage.getItem(storageKey(device)) ?? 0) || 0;
  } catch {
    return 0;
  }
}
function writeLastPrinted(device: string, n: number) {
  try {
    localStorage.setItem(storageKey(device), String(n));
  } catch {
    /* per-laptop convenience only */
  }
}

export function ContingencyButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <FileText aria-hidden="true" />
        Preparar hojas para imprimir
      </Button>
      {open && <ContingencySheets onClose={() => setOpen(false)} />}
    </>
  );
}

function ContingencySheets({ onClose }: { onClose: () => void }) {
  const { jornadaId } = useSession();
  const [device, setDevice] = useState("A");
  const [count, setCount] = useState(5);
  const [folios, setFolios] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const d = await currentDevice();
      const { events } = await platform.store.list(0);
      if (alive) {
        setDevice(d);
        setFolios(nextPaperFolios(events, d, Math.min(Math.max(count, 1), 50), readLastPrinted(d)));
      }
    })();
    return () => { alive = false; };
  }, [count]);

  function rememberPrinted() {
    const last = folios[folios.length - 1];
    if (last) writeLastPrinted(device, Number(last.split("-")[1]));
  }

  return (
    <PrintOverlay
      title="Hojas de contingencia"
      hint="Imprímelas antes de la jornada. Si la laptop falla, se llenan a mano y luego se capturan con su folio de papel."
      printLabel={`Imprimir ${folios.length} hojas`}
      onPrint={rememberPrinted}
      onClose={onClose}
      controls={
        <div className="flex flex-col gap-xs">
          <Label htmlFor="cs-count">Cuántas hojas</Label>
          <Input id="cs-count" type="number" min={1} max={50} className="w-control-lg" value={count}
            onChange={(e) => setCount(Number(e.target.value) || 1)} />
        </div>
      }
    >
      {folios.map((f) => <Sheet key={f} folio={f} device={device} jornadaId={jornadaId} />)}
    </PrintOverlay>
  );
}

function Line({ label, wide }: { label: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2 flex flex-col gap-xs" : "flex flex-col gap-xs"}>
      <span className="type-caption">{label}</span>
      <span className="block h-control border-b border-foreground" />
    </div>
  );
}

function Box({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-xs type-caption">
      <span aria-hidden="true" className="inline-block size-md border border-foreground" />
      {label}
    </span>
  );
}

function Sheet({ folio, device, jornadaId }: { folio: string; device: string; jornadaId: string }) {
  return (
    <article className="flex w-full max-w-3xl flex-col gap-md rounded-card border bg-card p-lg text-foreground shadow-sm break-after-page print:max-w-none print:rounded-none print:border-0 print:shadow-none">
      <header className="flex items-start justify-between gap-md border-b border-foreground pb-sm">
        <div className="flex flex-col">
          <span className="type-heading">Expediente Rosa · Hoja de contingencia</span>
          <span className="type-caption">Laptop {device} · {jornadaId} · Fecha: ____ / ____ / ________</span>
        </div>
        <div className="flex flex-col items-end rounded-md border-2 border-dashed border-foreground px-md py-xs">
          <span className="type-caption">Folio de papel</span>
          <span className="type-folio">{folio}</span>
        </div>
      </header>
      <p className="type-caption">
        Al volver a la laptop: “Nueva paciente” → marca “Viene de hoja de contingencia” y escribe {folio}.
      </p>

      <section className="flex flex-col gap-sm">
        <h3 className="type-body-strong">Identificación</h3>
        <div className="grid grid-cols-2 gap-x-lg gap-y-sm">
          <Line label="Nombre completo" wide />
          <Line label="Fecha de nacimiento (DD/MM/AAAA)" />
          <Line label="Edad" />
          <Line label="Entidad de nacimiento" />
          <Line label="Municipio" />
          <Line label="Residencia habitual (localidad, colonia)" wide />
          <Line label="Teléfono" />
          <Line label="Otro teléfono (familiar o vecina)" />
          <Line label="Correo electrónico" wide />
        </div>
        <div className="flex flex-col gap-xs">
          <span className="type-caption">Afiliación a servicios de salud</span>
          <div className="flex flex-wrap gap-md">{AFFILIATIONS.map((a) => <Box key={a} label={a} />)}</div>
        </div>
        <div className="grid grid-cols-2 gap-x-lg gap-y-sm">
          <Line label="Número de afiliación" />
          <div className="flex flex-col gap-xs">
            <span className="type-caption">¿Cuenta con Cartilla EIRA?</span>
            <div className="flex gap-md"><Box label="Sí" /><Box label="No" /></div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-sm">
        <h3 className="type-body-strong">Aviso de privacidad</h3>
        <div className="grid grid-cols-2 gap-x-lg gap-y-sm">
          <Box label={`La paciente leyó o escuchó el aviso (versión ${PRIVACY_NOTICE_VERSION}) y lo acepta`} />
          <Line label="Firma o huella de la paciente" />
        </div>
      </section>

      <section className="flex flex-col gap-sm">
        <h3 className="type-body-strong">Visita</h3>
        <div className="grid grid-cols-2 gap-x-lg gap-y-sm">
          <Line label="Talla (cm)" />
          <Line label="Peso (kg)" />
          <Line label="Presión arterial (120/80)" />
          <Line label="Glucosa (mg/dL)" />
          <Line label="FUM (fecha de última menstruación)" />
          <Line label="Motivo de la consulta" />
        </div>
        <div className="flex flex-wrap items-end gap-lg">
          <Box label="Citología" />
          <Box label="Revisión mamaria" />
        </div>
        <div className="grid grid-cols-2 gap-x-lg gap-y-sm">
          <Line label="Número citológico" />
          <Line label="Cédula de quien toma la muestra" />
          <Line label="Llenó (nombre)" />
          <Line label="Capturó en la laptop (nombre y fecha)" />
        </div>
      </section>
    </article>
  );
}

// ISS-0024: printable Cartilla EIRA card (ID-1 size, 85.6 x 54 mm). The QR encodes only the folio.
import { useMemo, useState } from "react";
import { IdCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import appIcon from "@/assets/brand/app-icon.svg";
import { PrintOverlay } from "@/components/PrintOverlay";
import { formatDate } from "@/domain/autofill";
import { cartillaData, qrPath, type CartillaData } from "@/domain/cartilla";
import type { PatientRecord } from "@/domain/projection";
import { cn } from "@/lib/utils";

const todayLocal = () => new Date().toLocaleDateString("sv-SE");

export function CartillaButton({ record }: { record: PatientRecord }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <IdCard aria-hidden="true" />
        Imprimir Cartilla
      </Button>
      {open && (
        <PrintOverlay
          title="Cartilla EIRA"
          hint="Tamaño tarjeta (8.6 × 5.4 cm). El código QR solo lleva el folio: sin nombre ni datos clínicos."
          printLabel="Imprimir Cartilla"
          onClose={() => setOpen(false)}
        >
          <CartillaCard data={cartillaData(record, todayLocal())} />
        </PrintOverlay>
      )}
    </>
  );
}

export function CartillaCard({ data }: { data: CartillaData }) {
  const qr = useMemo(() => qrPath(data.qrText), [data.qrText]);
  return (
    <article
      aria-label={`Cartilla EIRA de ${data.fullName}, folio ${data.folio}`}
      className="flex h-cartilla-h w-cartilla-w shrink-0 flex-col gap-sm overflow-hidden rounded-card border border-border bg-card p-md text-foreground shadow-sm print:border-foreground print:shadow-none"
    >
      <div className="flex items-center gap-sm">
        <img src={appIcon} alt="" className="size-control" />
        <span className="flex flex-col">
          <span className="type-body-strong">Expediente <span className="text-brand-text">Rosa</span></span>
          <span className="type-caption text-muted-foreground">Cartilla EIRA</span>
        </span>
      </div>
      <div className="flex min-h-0 flex-1 items-end justify-between gap-sm">
        <div className="flex min-w-0 flex-col gap-xs">
          <span
            className={cn(
              "self-start rounded-md border px-xs type-folio",
              data.provisional ? "border-dashed border-warning-border bg-warning-subtle text-on-warning-subtle" : "border-foreground",
            )}
          >
            {data.folio}
            {data.provisional && <span className="ml-xs type-caption">provisional</span>}
          </span>
          <span className="line-clamp-2 type-body-strong">{data.fullName}</span>
          {data.nextVisit && (
            <span className="flex flex-col type-caption">
              <span className="text-muted-foreground">Próxima visita sugerida</span>
              <span className="font-semibold">{formatDate(data.nextVisit)}</span>
            </span>
          )}
        </div>
        <svg
          viewBox={`0 0 ${qr.size} ${qr.size}`}
          className="size-cartilla-qr shrink-0 fill-foreground"
          shapeRendering="crispEdges"
          role="img"
          aria-label={`Código QR del folio ${data.folio}`}
        >
          <rect width={qr.size} height={qr.size} className="fill-card" />
          <path d={qr.d} />
        </svg>
      </div>
    </article>
  );
}

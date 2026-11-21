// ISS-0013: a service's latest result, locked for roles that cannot see clinical data.
import { FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ServiceRecord } from "@/domain/projection";
import type { Role } from "@/domain/events";
import { ROLE_LABEL } from "@/app/session";
import { bethesdaLabel, biradsLabel, canSeeClinical, followUpLabel } from "@/domain/results";
import { DataRow, RoleLocked } from "./RoleSensitive";

export const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const month = d.toLocaleDateString("es-MX", { month: "short" }).replace(".", "");
  return `${d.getDate()} ${month} ${d.getFullYear()}`;
};

export function ResultView({ service, role }: { service: ServiceRecord; role: Role }) {
  const r = service.result;
  if (!r) {
    return <Badge variant="warning">Resultado pendiente</Badge>;
  }
  const header = (
    <p className="flex flex-wrap items-center gap-sm type-caption text-muted-foreground">
      <FileCheck2 aria-hidden="true" className="size-5" />
      Resultado del {formatDate(r.at)} · {ROLE_LABEL[r.role]} ({r.author})
      {service.results.length > 1 && ` · corregido ${service.results.length - 1} ${service.results.length === 2 ? "vez" : "veces"}`}
    </p>
  );
  if (!canSeeClinical(role)) {
    return (
      <div className="flex flex-col gap-sm">
        {header}
        <RoleLocked label="Resultado" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-sm">
      {header}
      <dl className="grid gap-md sm:grid-cols-2">
        {service.serviceType === "citologia" ? (
          <DataRow label="Bethesda" value={bethesdaLabel(r.bethesda)} />
        ) : (
          <DataRow label="BI-RADS" value={biradsLabel(r.birads)} />
        )}
        <DataRow label="Conducta a seguir" value={followUpLabel(r.followUp)} />
        <DataRow label="Repetir estudio" value={r.repeatStudy ? "Sí" : "No"} />
        {r.notes && <DataRow label="Observaciones" value={r.notes} />}
      </dl>
    </div>
  );
}

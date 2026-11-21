// ISS-0022: patients who need follow-up, derived from results. Overdue first.
// Clinical roles see the category and reason; the capturista sees only "Requiere seguimiento" and the date.
import { useMemo } from "react";
import { AlertTriangle, CalendarClock, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolioTag } from "@/components/MatchCard";
import { useNavigation } from "@/app/navigation";
import { useSession } from "@/app/session";
import { useRecords } from "@/app/useRecords";
import { formatDate } from "@/domain/autofill";
import { CATEGORY_LABEL, NON_CLINICAL_LABEL, pendingFollowUps } from "@/domain/followUp";

const todayLocal = () => new Date().toLocaleDateString("sv-SE");

export function FollowUpScreen() {
  const { user } = useSession();
  const { go } = useNavigation();
  const { model, version } = useRecords();
  const today = useMemo(todayLocal, []);
  const items = useMemo(() => pendingFollowUps(model, today), [model, today]);
  const clinical = !!user && user.role !== "capturista";
  const overdue = items.filter((i) => i.overdue).length;

  return (
    <section className="flex flex-col gap-lg">
      <header className="flex flex-col gap-xs">
        <h1 className="type-title">Seguimiento</h1>
        <p className="text-muted-foreground">
          {version === 0
            ? "Cargando…"
            : items.length
              ? `${items.length} pacientes por contactar${overdue ? `, ${overdue} con fecha vencida` : ""}.`
              : "Nadie tiene seguimiento pendiente. Aquí aparecen las pacientes cuando un resultado lo pida."}
        </p>
        {!clinical && items.length > 0 && (
          <p className="type-caption text-muted-foreground">Por privacidad, el motivo clínico solo lo ve el personal médico.</p>
        )}
      </header>

      {items.length > 0 && (
        <ul className="flex flex-col gap-sm" aria-label="Pacientes con seguimiento pendiente">
          {items.map((i) => (
            <li key={i.serviceId} className="flex flex-wrap items-center justify-between gap-md rounded-xl border bg-card p-md shadow-sm sm:flex-nowrap">
              <div className="flex min-w-0 flex-1 flex-col gap-xs">
                <div className="flex flex-wrap items-center gap-sm">
                  <span className="type-body-strong">{i.fullName}</span>
                  <FolioTag folio={i.folio} />
                </div>
                <div className="flex items-center gap-sm">
                  {clinical ? (
                    <Badge variant={i.priority === 1 ? "danger" : "secondary"} title={i.reason}>{CATEGORY_LABEL[i.category]}</Badge>
                  ) : (
                    <Badge variant="secondary">{NON_CLINICAL_LABEL}</Badge>
                  )}
                  {clinical && <span className="min-w-0 type-caption text-muted-foreground">{i.reason}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-md">
                <span className={i.overdue ? "flex items-center gap-xs type-label text-danger" : "flex items-center gap-xs type-label"}>
                  {i.overdue ? <AlertTriangle className="size-5" aria-hidden="true" /> : <CalendarClock className="size-5" aria-hidden="true" />}
                  {i.overdue ? "Vencido el " : "Antes del "}
                  {formatDate(i.dueDate)}
                </span>
                <Button variant="outline" onClick={() => go({ name: "patient", patientId: i.patientId })}>
                  <FolderOpen aria-hidden="true" />
                  Abrir expediente
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

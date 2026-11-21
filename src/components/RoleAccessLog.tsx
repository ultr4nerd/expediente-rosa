// ISS-0023: "Accesos a datos sensibles". Who revealed sensitive data of this record, with role,
// device and time. Visible only to admin; other roles get nothing (not even a placeholder).
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_USERS, ROLE_LABEL } from "@/app/session";
import type { Role } from "@/domain/events";
import type { AccessEntry } from "@/domain/projection";
import { SECTION_LABEL, canSeeAccessLog } from "@/domain/access";
import { formatDateTime } from "./ConflictPanel";

const authorName = (id: string) => DEMO_USERS.find((u) => u.id === id)?.name ?? id;

export function RoleAccessLog({ entries, role }: { entries: AccessEntry[]; role: Role }) {
  if (!canSeeAccessLog(role)) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-sm type-heading">
          <ShieldCheck aria-hidden="true" className="size-5" />
          Accesos a datos sensibles
        </CardTitle>
        <CardDescription>Cada vez que alguien pulsa “Mostrar” en un dato sensible queda registrado aquí.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="type-body text-muted-foreground">Nadie ha consultado datos sensibles de esta paciente.</p>
        ) : (
          <ul className="flex flex-col gap-sm">
            {[...entries].reverse().map((a) => (
              <li key={a.eventId} className="flex flex-col gap-xs border-b pb-sm last:border-b-0 last:pb-0">
                <span className="type-body-strong">{SECTION_LABEL[a.section]}</span>
                <span className="type-caption text-muted-foreground">
                  {authorName(a.author)} ({ROLE_LABEL[a.role]}) · Equipo {a.device} · {formatDateTime(a.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// "Enviar y recibir": plain status, sync button and duplicates for everyone; server address, hub and backup for admin.
// Spec: docs/specs/sync-protocol-and-platform-contract.md; UI rules: design/DESIGN.md.
import { useState } from "react";
import { Cloud, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_CENTRAL_URL,
  setCentralUrl,
  syncNow,
  useSync,
} from "@/components/SyncIndicator";
import { platform } from "@/platform";
import { ConflictPanel } from "@/components/ConflictPanel";
import { BackupPanel } from "@/components/BackupPanel";
import { useSession } from "@/app/session";
import { ContingencyButton } from "@/components/ContingencySheets";
import { DuplicatesPanel } from "@/components/DuplicatesPanel";
import { HubToggle } from "@/components/HubToggle";

function formatDateTime(iso?: string): string {
  if (!iso) return "Todavía no";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Todavía no";
  return d.toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function SyncScreen() {
  const { status, syncing, centralUrl } = useSync();
  const { user } = useSession();
  // Field staff see only the status, the button and the duplicates; technical settings are for coordination.
  // The JSON backup holds every record unencrypted: only administration may export or restore it.
  const isAdmin = user?.role === "admin";
  const canResolveConflicts = user?.role === "admin" || user?.role === "medico";
  const [draft, setDraft] = useState(centralUrl);
  const online = status.connectivity === "online";
  const offline = status.connectivity === "offline";

  const headline = offline
    ? "Sin conexión: se enviará cuando vuelva la señal"
    : status.pending > 0
      ? `${status.pending === 1 ? "1 cambio" : `${status.pending} cambios`} por enviar`
      : online
        ? "Todo guardado en esta laptop y enviado a la oficina"
        : "Todo guardado en esta laptop";

  return (
    <section className="flex w-full max-w-prose flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        <h1 className="type-title">Enviar y recibir</h1>
        <p className="text-muted-foreground">
          Esta laptop guarda todo aunque no haya señal. Cuando haya internet, se envía a la oficina y se reciben los
          folios definitivos.
        </p>
      </div>

      <DuplicatesPanel />

      {platform.kind === "memory" && (
        <p className="type-body text-muted-foreground">
          Versión de prueba en el navegador: lo que captures aquí no se envía.
        </p>
      )}

      <Card>
        <CardContent className="flex flex-col gap-md">
          <p role="status" className="flex items-center gap-sm type-heading">
            {offline ? <CloudOff aria-hidden="true" className="size-5" /> : <Cloud aria-hidden="true" className="size-5" />}
            {headline}
          </p>
          <p className="type-body text-muted-foreground">
            Último envío: {formatDateTime(status.lastSyncAt)}.
          </p>
          {status.lastError && (
            <p role="status" className="type-body text-on-danger-subtle bg-danger-subtle rounded-md p-sm">
              No se pudo terminar el envío. Tus datos siguen guardados aquí; se volverá a intentar solo.
            </p>
          )}
          <Button size="lg" onClick={() => void syncNow()} disabled={syncing} className="self-start">
            {syncing ? <Loader2 aria-hidden="true" className="animate-spin" /> : <RefreshCw aria-hidden="true" />}
            {syncing ? "Enviando y recibiendo…" : "Sincronizar ahora"}
          </Button>
        </CardContent>
      </Card>

      {canResolveConflicts && <ConflictPanel />}

      {isAdmin && <BackupPanel />}
      <div><ContingencyButton /></div>
      {isAdmin && (
        <details className="flex flex-col gap-md rounded-card border bg-card p-md">
          <summary className="min-h-control cursor-pointer type-body-strong">Opciones avanzadas (solo coordinación)</summary>
          <div className="mt-md flex flex-col gap-lg">
        <Card>
          <CardHeader>
            <CardTitle>Dirección del servidor o de la otra laptop</CardTitle>
            <CardDescription>
              Normalmente es la de la oficina ({DEFAULT_CENTRAL_URL}). Cámbiala solo si vas a compartir con la otra laptop sin internet.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-md">
            <p className="type-body">
              Conexión con la oficina:{" "}
              {online ? (
                <Badge variant="success"><Cloud aria-hidden="true" />En línea</Badge>
              ) : offline ? (
                <Badge variant="offline"><CloudOff aria-hidden="true" />Sin conexión</Badge>
              ) : (
                <Badge variant="secondary">Comprobando</Badge>
              )}
            </p>
            <form
              className="flex flex-wrap items-end gap-md"
              onSubmit={(e) => {
                e.preventDefault();
                setCentralUrl(draft);
                setDraft(draft.trim() || DEFAULT_CENTRAL_URL);
                void syncNow();
              }}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-xs">
                <Label htmlFor="central-url">Dirección</Label>
                <Input
                  id="central-url"
                  type="url"
                  inputMode="url"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={DEFAULT_CENTRAL_URL}
                />
              </div>
              <Button type="submit" variant="outline" disabled={draft.trim() === centralUrl}>
                Guardar dirección
              </Button>
            </form>
          </CardContent>
        </Card>
            <HubToggle />
          </div>
        </details>
      )}
    </section>
  );
}

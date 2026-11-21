// Sync detail: central URL, last sync, pending count and a manual "sync now".
// Spec: docs/specs/sync-protocol-and-platform-contract.md; UI rules: design/DESIGN.md.
import { useState } from "react";
import { Cloud, CloudOff, FileText, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_CENTRAL_URL,
  pendingLabel,
  setCentralUrl,
  syncNow,
  useSync,
} from "@/components/SyncIndicator";
import { platform } from "@/platform";
import { ConflictPanel } from "@/components/ConflictPanel";
import { BackupPanel } from "@/components/BackupPanel";
import { ContingencyButton } from "@/components/ContingencySheets";
import { DuplicatesPanel } from "@/components/DuplicatesPanel";

function formatDateTime(iso?: string): string {
  if (!iso) return "Todavía no";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Todavía no";
  return d.toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function SyncScreen() {
  const { status, syncing, centralUrl } = useSync();
  const [draft, setDraft] = useState(centralUrl);
  const online = status.connectivity === "online";

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-lg">
      <header className="flex flex-col gap-xs">
        <h1 className="type-title">Sincronización</h1>
        <p className="text-muted-foreground">
          {platform.kind === "memory"
            ? "Modo navegador: los datos viven solo en esta pestaña y no se sincronizan."
            : "Todo se guarda cifrado en esta laptop y se envía a la central cuando vuelve la red."}
        </p>
      </header>

      {/* Decisions a person must take come first. Each panel renders nothing when there is nothing to decide. */}
      <DuplicatesPanel />
      <ConflictPanel />

      <div className="grid gap-lg lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle><h2 className="type-heading">Estado</h2></CardTitle>
          <CardDescription>Se sincroniza sola cada 10 segundos cuando hay red.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-md">
          <dl className="grid grid-cols-2 gap-md">
            <div className="flex flex-col gap-xs">
              <dt className="type-label text-muted-foreground">Conexión con la central</dt>
              <dd>
                {online ? (
                  <Badge variant="success"><Cloud aria-hidden="true" />En línea</Badge>
                ) : status.connectivity === "offline" ? (
                  <Badge variant="offline"><CloudOff aria-hidden="true" />Sin conexión</Badge>
                ) : (
                  <Badge variant="secondary">Comprobando</Badge>
                )}
              </dd>
            </div>
            <div className="flex flex-col gap-xs">
              <dt className="type-label text-muted-foreground">Por enviar</dt>
              <dd className="type-body-strong">
                {status.pending === 0 ? "Nada pendiente" : pendingLabel(status.pending)}
              </dd>
            </div>
            <div className="flex flex-col gap-xs">
              <dt className="type-label text-muted-foreground">Última sincronización</dt>
              <dd className="type-body">{formatDateTime(status.lastSyncAt)}</dd>
            </div>
          </dl>
          {status.lastError && (
            <p role="status" className="type-body text-on-danger-subtle bg-danger-subtle rounded-md p-sm">
              No se pudo terminar la sincronización. Tus datos siguen guardados aquí; se reintentará sola.
            </p>
          )}
          <Button size="lg" onClick={() => void syncNow()} disabled={syncing} className="self-start">
            {syncing ? <Loader2 aria-hidden="true" className="animate-spin" /> : <RefreshCw aria-hidden="true" />}
            {syncing ? "Sincronizando…" : "Sincronizar ahora"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><h2 className="type-heading">Dirección de la central</h2></CardTitle>
          <CardDescription>Por defecto {DEFAULT_CENTRAL_URL}. Cámbiala solo si te lo indica el equipo de EIRA.</CardDescription>
        </CardHeader>
        <CardContent>
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
              <Label htmlFor="central-url">URL de la central</Label>
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
      </div>

      <div className="grid gap-lg lg:grid-cols-2">
        <BackupPanel />
        <section aria-labelledby="contingency-title" className="flex flex-col gap-md rounded-xl border bg-card p-lg shadow-sm">
          <div className="flex flex-col gap-xs">
            <h2 id="contingency-title" className="flex items-center gap-sm type-heading">
              <FileText aria-hidden="true" className="size-5" />Hoja de contingencia
            </h2>
            <p className="type-caption text-muted-foreground">
              Si una laptop falla a media jornada, imprime hojas en papel con folios ya asignados y captúralas después.
            </p>
          </div>
          <div><ContingencyButton /></div>
        </section>
      </div>
    </section>
  );
}

// ISS-0021: "Esta laptop es el hub". Starts an HTTP server in Rust that serves the central's API over
// this laptop's encrypted store, so the other laptop syncs over local Wi-Fi without internet.
// The hub does not assign final folios: those still come from the central when there is internet.
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Loader2, Radio, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isTauri } from "@/platform";

interface HubInfo {
  running: boolean;
  port: number;
  url?: string;
}

export function HubToggle() {
  const [info, setInfo] = useState<HubInfo | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isTauri) return;
    invoke<HubInfo>("hub_status").then(setInfo).catch(() => setInfo(null));
  }, []);

  async function toggle() {
    if (!info || busy) return;
    setBusy(true);
    try {
      const next = await invoke<HubInfo>(info.running ? "hub_stop" : "hub_start");
      setInfo(next);
      toast.success(next.running ? "Esta laptop ya es el hub de la jornada." : "Hub detenido.");
    } catch (err) {
      toast.error(`No se pudo iniciar el hub. ${typeof err === "string" ? err : ""}`.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-sm">
          <Radio aria-hidden="true" className="size-5" />
          Hub sin internet
        </CardTitle>
        <CardDescription>
          Una laptop recibe y comparte los registros por la red local (wifi o hotspot), sin internet. Los folios
          definitivos siguen llegando de la central cuando vuelva la red.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-md">
        {!isTauri ? (
          <p className="type-body text-muted-foreground">Disponible solo en la app de escritorio.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-md">
              <Button
                role="switch"
                aria-checked={!!info?.running}
                variant={info?.running ? "outline" : "default"}
                disabled={!info || busy}
                onClick={toggle}
              >
                {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Wifi aria-hidden="true" />}
                {info?.running ? "Dejar de ser el hub" : "Esta laptop es el hub"}
              </Button>
              {info?.running ? (
                <Badge variant="success">Hub activo</Badge>
              ) : (
                <Badge variant="outline">Hub apagado</Badge>
              )}
            </div>
            {info?.running && (
              <div className="flex flex-col gap-xs rounded-control bg-surface-sunken p-md">
                <span className="type-body">En la otra laptop, escribe esta dirección de la central y sincroniza:</span>
                <span className="type-folio select-all">{info.url ?? `http://<ip-de-esta-laptop>:${info.port}`}</span>
                <span className="type-caption text-muted-foreground">
                  Las dos laptops deben estar en la misma red. Si Windows pregunta por el firewall, permite el acceso en redes privadas.
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

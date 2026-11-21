// ISS-0021: "Esta laptop es el hub". Starts an HTTP server in Rust that serves the central's API over
// this laptop's encrypted store, so the other laptop syncs over local Wi-Fi without internet.
// The hub does not assign final folios: those still come from the central when there is internet.
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Copy, Loader2, Radio, Wifi } from "lucide-react";
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
      toast.success(next.running ? "Esta laptop ya comparte los registros con la otra." : "Esta laptop dejó de compartir.");
    } catch (err) {
      toast.error(`No se pudo empezar a compartir. ${typeof err === "string" ? err : ""}`.trim());
    } finally {
      setBusy(false);
    }
  }

  const address = info?.url ?? `http://<ip-de-esta-laptop>:${info?.port ?? 8788}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Dirección copiada.");
    } catch {
      toast.error("No se pudo copiar. Escríbela a mano en la otra laptop.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-sm">
          <Radio aria-hidden="true" className="size-5" />
          Compartir con la otra laptop (sin internet)
        </CardTitle>
        <CardDescription>
          Las dos laptops pueden pasarse la información sin internet si están en la misma red Wi‑Fi, por ejemplo el
          hotspot de un celular aunque no tenga datos.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-md">
        {!isTauri ? (
          <p className="type-body text-muted-foreground">Disponible solo en la app de escritorio.</p>
        ) : (
          <ol className="flex flex-col gap-md">
            <li className="flex flex-col gap-xs">
              <span className="type-body-strong">1. Conecta las dos laptops a la misma red Wi‑Fi o al hotspot de un celular.</span>
            </li>
            <li className="flex flex-col gap-sm">
              <span className="type-body-strong">2. En esta laptop, activa «Compartir desde esta laptop».</span>
              <div className="flex flex-wrap items-center gap-md">
                <Button
                  role="switch"
                  aria-checked={!!info?.running}
                  variant={info?.running ? "outline" : "default"}
                  disabled={!info || busy}
                  onClick={toggle}
                >
                  {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Wifi aria-hidden="true" />}
                  {info?.running ? "Dejar de compartir" : "Compartir desde esta laptop"}
                </Button>
                {info?.running ? (
                  <Badge variant="success">Compartiendo</Badge>
                ) : (
                  <Badge variant="outline">Sin compartir</Badge>
                )}
              </div>
            </li>
            {info?.running && (
              <li className="flex flex-col gap-sm rounded-control bg-surface-sunken p-md">
                <span className="type-body-strong">
                  3. En la otra laptop, abre «Enviar y recibir», escribe esta dirección y pulsa «Sincronizar ahora»:
                </span>
                <div className="flex flex-wrap items-center gap-md">
                  <span className="type-title font-mono select-all">{address}</span>
                  <Button variant="outline" onClick={copy}>
                    <Copy aria-hidden="true" />Copiar
                  </Button>
                </div>
              </li>
            )}
          </ol>
        )}
        <p className="type-caption text-muted-foreground">
          Los folios definitivos se asignan después, cuando alguna laptop se conecte a internet. En Windows puede
          aparecer un aviso del firewall: elige «Permitir».
        </p>
      </CardContent>
    </Card>
  );
}

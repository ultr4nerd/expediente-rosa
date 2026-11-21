// Scans the Cartilla EIRA QR with the computer's camera (getUserMedia) and hands back the folio.
// Decoding is local (jsQR, bundled): no network. The QR on the card encodes only the folio.
import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, CameraOff, ScanLine } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { looksLikeFolio, normalizeFolio } from "@/domain/matching";

type State = "starting" | "scanning" | "denied";

export function CartillaScanButton({ onFolio }: { onFolio: (folio: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" size="lg" onClick={() => setOpen(true)}>
        <ScanLine aria-hidden="true" />
        Escanear cartilla
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-prose">
          <DialogHeader>
            <DialogTitle>Escanear cartilla</DialogTitle>
            <DialogDescription>Apunta la cámara al código de la cartilla.</DialogDescription>
          </DialogHeader>
          {open && (
            <CartillaScanner
              onFolio={(f) => {
                setOpen(false);
                onFolio(f);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Text from a QR that is a folio, normalized ("2026-0101", "A-0001"); null otherwise. */
export function folioFromQr(text: string): string | null {
  const t = text.trim();
  return looksLikeFolio(t) ? normalizeFolio(t) : null;
}

function CartillaScanner({ onFolio }: { onFolio: (folio: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<State>("starting");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  /** Camera the user picked (restarts the stream); activeId is the one in use (display only). */
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [other, setOther] = useState<string | null>(null);
  const done = useRef(false);
  const onFolioRef = useRef(onFolio);
  onFolioRef.current = onFolio;


  const start = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "environment" },
        audio: false,
      });
      // Labels are only filled in after permission is granted, so list the cameras now.
      const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
      setDevices(cams);
      setActiveId(stream.getVideoTracks()[0]?.getSettings().deviceId);
      return stream;
    } catch {
      setState("denied");
      return null;
    }
  }, [deviceId]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer = 0;
    let alive = true;
    setState("starting");
    start().then(async (s) => {
      if (!alive || !s) {
        s?.getTracks().forEach((t) => t.stop());
        return;
      }
      stream = s;
      const video = videoRef.current!;
      video.srcObject = s;
      await video.play().catch(() => undefined);
      setState("scanning");
      const tick = () => {
        if (!alive || done.current) return;
        const canvas = canvasRef.current;
        if (canvas && video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
            if (code?.data) {
              const folio = folioFromQr(code.data);
              if (folio) {
                done.current = true;
                onFolioRef.current(folio);
                return;
              }
              setOther(code.data.slice(0, 40));
            }
          }
        }
        timer = window.setTimeout(tick, 150);
      };
      tick();
    });
    // Stop the camera when the dialog closes or the camera changes.
    return () => {
      alive = false;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [start]);

  if (state === "denied") {
    return (
      <p role="alert" className="flex items-start gap-sm rounded-md bg-danger-subtle p-md text-on-danger-subtle">
        <CameraOff className="size-5 shrink-0" aria-hidden="true" />
        No pudimos usar la cámara. Escribe el folio o usa un lector USB.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-sm">
      <div className="relative overflow-hidden rounded-md border bg-muted">
        <video ref={videoRef} muted playsInline className="block w-full" aria-label="Vista de la cámara" />
        {state === "starting" && (
          <p className="absolute inset-0 flex items-center justify-center gap-sm type-label text-muted-foreground">
            <Camera className="size-5" aria-hidden="true" />
            Abriendo la cámara…
          </p>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <p role="status" className="type-caption text-muted-foreground">
        {other ? "Ese código no es un folio de Expediente Rosa. Prueba con la cartilla." : "Apunta la cámara al código de la cartilla."}
      </p>
      {devices.length > 1 && (
        <div className="flex flex-col gap-xs">
          <Label htmlFor="scan-camera">Cámara</Label>
          <Select value={deviceId ?? activeId} onValueChange={setDeviceId}>
            <SelectTrigger id="scan-camera" className="w-full">
              <SelectValue placeholder="Elige una cámara" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((d, i) => (
                <SelectItem key={d.deviceId} value={d.deviceId}>{d.label || `Cámara ${i + 1}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

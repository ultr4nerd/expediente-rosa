// Página de muestra del sistema de diseño. Otro agente la reemplaza por las pantallas reales.
import { CloudOff, Check, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Wordmark } from "@/components/ui/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import inicio from "@/assets/illustrations/inicio-comunidad.webp";

function App() {
  return (
    <div className="min-h-screen bg-background">
      <div role="status" className="flex items-center gap-sm bg-offline px-lg py-sm text-on-offline type-label">
        <CloudOff className="size-5" aria-hidden="true" />
        Sin conexión. Todo se guarda en esta laptop y se sincroniza al volver la red.
      </div>
      <header className="flex items-center justify-between border-b bg-card px-lg py-md">
        <Wordmark withEndorsement />
        <div className="flex gap-sm">
          <Badge variant="success"><Check aria-hidden="true" />Sincronizado</Badge>
          <Badge variant="warning"><Clock aria-hidden="true" />12 pendientes</Badge>
          <Badge variant="danger"><AlertTriangle aria-hidden="true" />1 conflicto</Badge>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-lg p-lg md:grid-cols-2">
        <img src={inicio} alt="Mujeres de una comunidad junto a una doctora" className="w-full rounded-card shadow-raised" />
        <Card>
          <CardHeader>
            <CardTitle className="type-title">Nueva paciente</CardTitle>
            <CardDescription>
              Folio{" "}
              <span className="type-folio rounded-md border-2 border-dashed border-warning-border bg-warning-subtle px-sm text-on-warning-subtle">
                A-0007
              </span>{" "}
              provisional ·{" "}
              <span className="type-folio rounded-md border-2 border-border bg-card px-sm text-foreground">2026-0143</span>{" "}
              definitivo
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-md">
            <div className="flex flex-col gap-sm">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input id="nombre" placeholder="Ej. María López Hernández" />
            </div>
            <div className="flex flex-col gap-sm rounded-md border-l-4 border-autofill-border bg-autofill p-sm">
              <div className="flex items-center justify-between">
                <Label htmlFor="menarca">Edad de la primera menstruación</Label>
                <Badge variant="autofill">Del historial</Badge>
              </div>
              <Input id="menarca" defaultValue="13" />
            </div>
            <div className="flex gap-sm">
              <Button size="lg" onClick={() => toast.success("Paciente guardada en esta laptop")}>
                Guardar paciente
              </Button>
              <Button size="lg" variant="outline">Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Toaster />
    </div>
  );
}

export default App;

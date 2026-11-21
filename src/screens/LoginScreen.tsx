// Simulated sign-in: pick a demo user and type the PIN. Roles detail: ISS-0013.
import { useState } from "react";
import { Wordmark } from "@/components/ui/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_USERS, ROLE_LABEL, useSession, type DemoUser } from "@/app/session";
import { useNavigation } from "@/app/navigation";
import inicio from "@/assets/illustrations/inicio-comunidad.webp";

export function LoginScreen() {
  const { signIn } = useSession();
  const { go } = useNavigation();
  const [selected, setSelected] = useState<DemoUser>(DEMO_USERS[0]);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin !== selected.pin) {
      setError("El PIN no coincide. Intenta de nuevo.");
      return;
    }
    signIn(selected);
    go({ name: "search" });
  }

  return (
    <div className="grid min-h-screen bg-background md:grid-cols-2">
      <img src={inicio} alt="Mujeres de una comunidad junto a una doctora" className="hidden h-full w-full object-cover md:block" />
      <main className="flex items-center justify-center p-lg">
        <Card className="w-full max-w-prose">
          <CardHeader>
            <Wordmark withEndorsement />
            <CardTitle><h1 className="type-title">Iniciar jornada</h1></CardTitle>
            <CardDescription>Elige tu usuario. Todo se guarda cifrado en esta laptop.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="flex flex-col gap-md">
              <fieldset className="flex flex-col gap-sm">
                <legend className="type-label mb-sm">Usuario</legend>
                {DEMO_USERS.map((u) => (
                  <Button
                    key={u.id}
                    type="button"
                    variant="outline"
                    className={u.id === selected.id ? "justify-between border-primary bg-secondary text-secondary-foreground hover:bg-secondary" : "justify-between"}
                    aria-pressed={u.id === selected.id}
                    onClick={() => { setSelected(u); setError(null); document.getElementById("pin")?.focus(); }}
                  >
                    <span>{u.name}</span>
                    <span className="type-label">{ROLE_LABEL[u.role]}</span>
                  </Button>
                ))}
              </fieldset>
              <div className="flex flex-col gap-sm">
                <Label htmlFor="pin">PIN</Label>
                <Input id="pin" autoFocus type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} aria-invalid={error ? true : undefined} />
                {error && <p role="alert" className="type-caption text-danger">{error}</p>}
                <p className="type-caption text-muted-foreground">Demo: PIN {selected.pin} (usuarios ficticios).</p>
              </div>
              <Button type="submit" size="lg">Entrar</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

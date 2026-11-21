// App frame: header with brand, sync state and user; main area renders the current screen.
import type { ReactNode } from "react";
import { LogOut, Search, UserPlus, RefreshCw } from "lucide-react";
import { Wordmark } from "@/components/ui/wordmark";
import { Button } from "@/components/ui/button";
import { SyncIndicator } from "@/components/SyncIndicator";
import { ROLE_LABEL, useSession } from "./session";
import { useNavigation } from "./navigation";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useSession();
  const { go } = useNavigation();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-md border-b bg-card px-lg py-md">
        <Wordmark />
        <nav aria-label="Principal" className="flex gap-sm">
          <Button variant="ghost" onClick={() => go({ name: "search" })}><Search aria-hidden="true" />Buscar</Button>
          <Button variant="ghost" onClick={() => go({ name: "patient-new" })}><UserPlus aria-hidden="true" />Nueva paciente</Button>
          <Button variant="ghost" onClick={() => go({ name: "sync" })}><RefreshCw aria-hidden="true" />Sincronización</Button>
        </nav>
        <div className="flex items-center gap-md">
          <SyncIndicator />
          {user && (
            <span className="type-label text-muted-foreground">
              {user.name} · {ROLE_LABEL[user.role]}
            </span>
          )}
          <Button variant="outline" onClick={() => { signOut(); go({ name: "login" }); }}>
            <LogOut aria-hidden="true" />Salir
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-lg">{children}</main>
    </div>
  );
}

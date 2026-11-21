// App frame: header with brand, sync state and user; main area renders the current screen.
import type { ReactNode } from "react";
import { ClipboardList, LogOut, Search, RefreshCw } from "lucide-react";
import { Wordmark } from "@/components/ui/wordmark";
import { Button } from "@/components/ui/button";
import { SyncIndicator } from "@/components/SyncIndicator";
import { ROLE_LABEL, useSession } from "./session";
import { useNavigation } from "./navigation";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useSession();
  const { route, go } = useNavigation();
  // Patient screens and registration belong to the search flow, so "Buscar" stays highlighted there.
  const section = route.name === "patient" || route.name === "visit-new" || route.name === "patient-new" ? "search" : route.name;
  const nav = (name: "search" | "follow-up" | "sync") => ({
    variant: "ghost" as const,
    "aria-current": section === name ? ("page" as const) : undefined,
    className: section === name ? "bg-secondary text-secondary-foreground" : undefined,
    onClick: () => go({ name }),
  });
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex flex-wrap items-center gap-x-lg gap-y-sm border-b bg-card px-lg py-md">
        <Wordmark />
        {/* Below 1280px the nav drops to its own row instead of squeezing the status cluster. */}
        <nav aria-label="Principal" className="order-last flex w-full gap-sm xl:order-none xl:w-auto">
          <Button {...nav("search")}><Search aria-hidden="true" />Buscar</Button>
          <Button {...nav("follow-up")}><ClipboardList aria-hidden="true" />Seguimiento</Button>
          <Button {...nav("sync")}><RefreshCw aria-hidden="true" />Sincronización</Button>
        </nav>
        <div className="ml-auto flex items-center gap-sm">
          <SyncIndicator />
          {user && (
            <span className="flex flex-col text-right leading-tight">
              <span className="type-label">{user.name}</span>
              <span className="type-caption text-muted-foreground">{ROLE_LABEL[user.role]}</span>
            </span>
          )}
          <Button variant="outline" size="icon" aria-label="Salir" title="Salir" onClick={() => { signOut(); go({ name: "login" }); }}>
            <LogOut aria-hidden="true" />
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-lg">{children}</main>
    </div>
  );
}

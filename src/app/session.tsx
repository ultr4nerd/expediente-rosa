// Simulated session: demo users with a role. Real auth is out of scope (see MVP spec).
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Role } from "@/domain/events";

export interface DemoUser {
  id: string;
  name: string;
  role: Role;
  pin: string;
}

export const DEMO_USERS: DemoUser[] = [
  { id: "u-laura", name: "Laura Méndez", role: "capturista", pin: "1111" },
  { id: "u-ana", name: "Dra. Ana Robles", role: "medico", pin: "2222" },
  { id: "u-jorge", name: "Dr. Jorge Silva", role: "patologo", pin: "3333" },
  { id: "u-admin", name: "Coordinación EIRA", role: "admin", pin: "0000" },
];

export const ROLE_LABEL: Record<Role, string> = {
  capturista: "Capturista",
  medico: "Médico",
  patologo: "Patólogo",
  admin: "Administración",
};

/** Roles allowed to see sensitive gyneco-obstetric history (mentors: specialized doctors only). */
export const canSeeSensitive = (role: Role) => role === "medico" || role === "admin";

interface SessionValue {
  user: DemoUser | null;
  jornadaId: string;
  signIn: (user: DemoUser) => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const jornadaId = "jornada-2026-05-zapotitlan";
  return (
    <SessionContext.Provider value={{ user, jornadaId, signIn: setUser, signOut: () => setUser(null) }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}

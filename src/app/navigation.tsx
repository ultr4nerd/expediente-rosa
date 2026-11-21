// Minimal state-based navigation (no router): each screen lives in its own file under src/screens/.
import { createContext, useContext, useState, type ReactNode } from "react";

export type Route =
  | { name: "login" }
  | { name: "search" }
  | { name: "patient-new" }
  | { name: "patient"; patientId: string }
  | { name: "visit-new"; patientId: string }
  | { name: "sync" };

interface NavigationValue {
  route: Route;
  go: (route: Route) => void;
}

const NavigationContext = createContext<NavigationValue | null>(null);

export function NavigationProvider({ children, initial }: { children: ReactNode; initial: Route }) {
  const [route, go] = useState<Route>(initial);
  return <NavigationContext.Provider value={{ route, go }}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationValue {
  const value = useContext(NavigationContext);
  if (!value) throw new Error("useNavigation must be used inside NavigationProvider");
  return value;
}

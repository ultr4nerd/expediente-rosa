import { Toaster } from "@/components/ui/sonner";
import { NavigationProvider, useNavigation, type Route } from "@/app/navigation";
import { SessionProvider } from "@/app/session";
import { AppShell } from "@/app/AppShell";
import { LoginScreen } from "@/screens/LoginScreen";
import { SearchScreen } from "@/screens/SearchScreen";
import { PatientNewScreen } from "@/screens/PatientNewScreen";
import { PatientScreen } from "@/screens/PatientScreen";
import { VisitNewScreen } from "@/screens/VisitNewScreen";
import { SyncScreen } from "@/screens/SyncScreen";

function screenFor(route: Route) {
  switch (route.name) {
    case "search": return <SearchScreen />;
    case "patient-new": return <PatientNewScreen />;
    case "patient": return <PatientScreen patientId={route.patientId} />;
    case "visit-new": return <VisitNewScreen patientId={route.patientId} />;
    case "sync": return <SyncScreen />;
    case "login": return null;
  }
}

function Router() {
  const { route } = useNavigation();
  if (route.name === "login") return <LoginScreen />;
  return <AppShell>{screenFor(route)}</AppShell>;
}

export default function App() {
  return (
    <SessionProvider>
      <NavigationProvider initial={{ name: "login" }}>
        <Router />
        <Toaster />
      </NavigationProvider>
    </SessionProvider>
  );
}

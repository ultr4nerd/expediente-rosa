import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { NavigationProvider } from "@/app/navigation";
import { SessionProvider } from "@/app/session";
import { project } from "@/domain/projection";
import { SEED_MARIA_EJEMPLO, seedEvents } from "@/domain/seed";
import { VisitForm } from "./VisitNewScreen";

describe("VisitNewScreen", () => {
  it("María Ejemplo's second visit opens with subsecuente and the previous cytology number marked from history", () => {
    const model = project(seedEvents());
    const html = renderToString(
      <SessionProvider>
        <NavigationProvider initial={{ name: "visit-new", patientId: SEED_MARIA_EJEMPLO }}>
          <VisitForm record={model.patients[SEED_MARIA_EJEMPLO]} model={model} />
        </NavigationProvider>
      </SessionProvider>,
    );
    expect(html).toContain("María Ejemplo");
    expect(html.match(/<input[^>]*value="subsecuente"[^>]*>/)?.[0]).toContain("checked");
    expect(html).toContain('value="CIT-2026-0001"');
    expect(html).toContain("Del historial");
    expect(html).toContain("datos reutilizados del historial");
  });
});

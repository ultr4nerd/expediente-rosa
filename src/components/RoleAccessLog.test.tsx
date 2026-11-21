import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { AccessEntry } from "@/domain/projection";
import { RoleAccessLog } from "./RoleAccessLog";
import { RoleHistory } from "./RoleClinicalPanel";

const entry: AccessEntry = {
  eventId: "v1", at: "2026-11-21T12:00:00", author: "u-ana", role: "medico", device: "B", jornadaId: "j",
  section: "sensitive_history",
};

describe("Accesos a datos sensibles", () => {
  it("admin sees who, role, device and section", () => {
    const html = renderToStaticMarkup(<RoleAccessLog entries={[entry]} role="admin" />);
    expect(html).toContain("Accesos a datos sensibles");
    expect(html).toContain("Dra. Ana Robles (Médico)");
    expect(html).toContain("Equipo B");
    expect(html).toContain("Antecedentes gineco-obstétricos sensibles");
  });

  it("admin sees an empty state; other roles see nothing", () => {
    expect(renderToStaticMarkup(<RoleAccessLog entries={[]} role="admin" />)).toContain("Nadie ha consultado");
    for (const role of ["capturista", "medico", "patologo"] as const) {
      expect(renderToStaticMarkup(<RoleAccessLog entries={[entry]} role={role} />)).toBe("");
    }
  });

  it("the sensitive history offers Mostrar to the doctor (the reveal that gets logged)", () => {
    const html = renderToStaticMarkup(<RoleHistory history={{ sexuallyActive: true }} role="medico" onReveal={() => undefined} />);
    expect(html).toContain("Mostrar");
  });
});

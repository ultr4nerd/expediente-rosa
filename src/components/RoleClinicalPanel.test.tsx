import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Role } from "@/domain/events";
import type { ServiceRecord } from "@/domain/projection";
import { RoleHistory, ServiceCard } from "./RoleClinicalPanel";
import { LOCKED_TEXT } from "./RoleSensitive";

const prov = { at: "2026-11-21T10:00:00", author: "u-jorge", role: "patologo" as Role, device: "A", jornadaId: "j" };
const service: ServiceRecord = {
  ...prov,
  eventId: "e1",
  author: "u-ana",
  role: "medico",
  serviceId: "s1",
  visitId: "v1",
  patientId: "p1",
  serviceType: "citologia",
  fields: {
    citologyKind: "subsecuente",
    gynecoObstetricStatus: ["Embarazo"],
    cervixObservation: [],
    riskFactors: ["Tabaquismo"],
    repeatedSample: false,
  },
  results: [],
};
const withResult: ServiceRecord = {
  ...service,
  results: [{ ...prov, eventId: "e2", serviceId: "s1", bethesda: "LSIL", repeatStudy: false }],
};
withResult.result = withResult.results[0];

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("role-gated clinical panel", () => {
  it("capturista sees a locked placeholder instead of sensitive history, service fields and results", () => {
    const history = html(<RoleHistory history={{ menarcheAge: 12, sexuallyActive: true, sexualDebutAge: 17 }} role="capturista" />);
    expect(history).toContain(LOCKED_TEXT);
    expect(history).toContain("12"); // non-sensitive history stays visible
    expect(history).not.toContain("Inicio de vida sexual");

    const card = html(<ServiceCard service={withResult} role="capturista" />);
    expect(card).toContain(LOCKED_TEXT);
    expect(card).not.toContain("Tabaquismo");
    expect(card).not.toContain("LSIL");
    expect(card).not.toContain("Registrar resultado");
    expect(card).not.toContain("Corregir resultado");
  });

  it("the doctor sees the history behind Mostrar, and service fields and results", () => {
    const history = html(<RoleHistory history={{ sexuallyActive: true }} role="medico" />);
    expect(history).not.toContain(LOCKED_TEXT);
    expect(history).toContain("Mostrar");
    const card = html(<ServiceCard service={withResult} role="medico" />);
    expect(card).toContain("Tabaquismo");
    expect(card).toContain("(LSIL)");
    expect(card).toContain("Corregir resultado");
  });

  it("the pathologist can record a pending result but not see the sexual history", () => {
    expect(html(<RoleHistory history={{ sexuallyActive: true }} role="patologo" />)).toContain(LOCKED_TEXT);
    const card = html(<ServiceCard service={service} role="patologo" />);
    expect(card).toContain("Resultado pendiente");
    expect(card).toContain("Registrar resultado");
  });
});

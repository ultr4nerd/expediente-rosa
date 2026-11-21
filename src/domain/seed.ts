// Fictitious seed data for demos: ~30 patients with past visits, as events with deterministic ids.
// Every name, phone and address here is invented (EIRA limit: never real patients).
import type { Affiliation, AnyEvent, CitologiaFields, Identity, MamaFields } from "./events";
import { newEvent, type Actor } from "./factory";
import type { EventStore } from "./ports";

/** Seed events come from the office laptop "S", so they never consume a field device's provisional counter. */
export const SEED_DEVICE = "S";

const capturista: Actor = { device: SEED_DEVICE, author: "u-laura", role: "capturista", jornadaId: "" };
const medico: Actor = { ...capturista, author: "u-ana", role: "medico" };
const patologo: Actor = { ...capturista, author: "u-jorge", role: "patologo" };

interface Jornada {
  id: string;
  site: string;
  date: string;
}

const JORNADAS: Jornada[] = [
  { id: "jornada-2025-09-tuxpan", site: "Tuxpan, centro de salud", date: "2025-09-20" },
  { id: "jornada-2025-11-sayula", site: "Sayula, DIF municipal", date: "2025-11-15" },
  { id: "jornada-2026-02-zapotitlan", site: "Zapotitlán de Vadillo, plaza principal", date: "2026-02-12" },
  { id: "jornada-2026-03-tamazula", site: "Tamazula de Gordiano, casa ejidal", date: "2026-03-21" },
];

interface SeedPatient {
  name: string;
  birthDate: string;
  municipality: string;
  /** Last 4 digits; full phone is 341555XXXX (fictitious 555 block). */
  phone4: string;
  affiliation: Affiliation;
  /** Index into JORNADAS. */
  jornada: number;
  services: Array<"citologia" | "mama">;
}

// María Ejemplo and María Ejemplar are the demo pair: similar names, different people.
const PATIENTS: SeedPatient[] = [
  { name: "María Ejemplo", birthDate: "1979-04-18", municipality: "Zapotitlán de Vadillo", phone4: "0142", affiliation: "INSABI", jornada: 2, services: ["citologia"] },
  { name: "María Ejemplar", birthDate: "1983-10-02", municipality: "Tuxpan", phone4: "7781", affiliation: "IMSS", jornada: 0, services: ["citologia", "mama"] },
  { name: "Ma. Guadalupe Hernández López", birthDate: "1971-12-12", municipality: "Zapotlán el Grande", phone4: "2210", affiliation: "ninguno", jornada: 1, services: ["mama"] },
  { name: "Rosa Elena Martínez de la Cruz", birthDate: "1966-06-05", municipality: "Sayula", phone4: "3345", affiliation: "ISSSTE", jornada: 1, services: ["citologia", "mama"] },
  { name: "Juana Pérez García", birthDate: "1988-02-27", municipality: "Tamazula de Gordiano", phone4: "9901", affiliation: "INSABI", jornada: 3, services: ["citologia"] },
  { name: "Verónica Sánchez Ochoa", birthDate: "1975-08-30", municipality: "Tecalitlán", phone4: "4410", affiliation: "IMSS", jornada: 3, services: ["mama"] },
  { name: "Leticia Gómez Villalobos", birthDate: "1990-01-14", municipality: "Tonila", phone4: "1023", affiliation: "ninguno", jornada: 0, services: ["citologia"] },
  { name: "Patricia Cárdenas Ruiz", birthDate: "1969-03-09", municipality: "Gómez Farías", phone4: "5567", affiliation: "INSABI", jornada: 1, services: ["citologia", "mama"] },
  { name: "Silvia Navarro Contreras", birthDate: "1981-11-21", municipality: "Zapotlán el Grande", phone4: "6612", affiliation: "IMSS", jornada: 2, services: ["mama"] },
  { name: "Carmen Delgado Íñiguez", birthDate: "1958-07-03", municipality: "Tapalpa", phone4: "7734", affiliation: "ISSSTE", jornada: 1, services: ["mama"] },
  { name: "Adriana Flores Mendoza", birthDate: "1993-05-16", municipality: "Tuxpan", phone4: "8845", affiliation: "ninguno", jornada: 0, services: ["citologia"] },
  { name: "Gabriela Ortiz Zúñiga", birthDate: "1986-09-25", municipality: "Zapotitlán de Vadillo", phone4: "9956", affiliation: "INSABI", jornada: 2, services: ["citologia", "mama"] },
  { name: "Teresa Aguilar Rentería", birthDate: "1962-04-11", municipality: "Tamazula de Gordiano", phone4: "1067", affiliation: "PEMEX", jornada: 3, services: ["mama"] },
  { name: "Claudia Vázquez Montes", birthDate: "1977-12-01", municipality: "Sayula", phone4: "2178", affiliation: "IMSS", jornada: 1, services: ["citologia"] },
  { name: "Alejandra Ríos Castañeda", birthDate: "1984-06-19", municipality: "Tecalitlán", phone4: "3289", affiliation: "ninguno", jornada: 3, services: ["citologia"] },
  { name: "Lucía Morales Becerra", birthDate: "1972-10-08", municipality: "Tonila", phone4: "4390", affiliation: "INSABI", jornada: 0, services: ["citologia", "mama"] },
  { name: "Margarita Chávez Lomelí", birthDate: "1960-02-22", municipality: "Zapotlán el Grande", phone4: "5401", affiliation: "SEDENA", jornada: 2, services: ["mama"] },
  { name: "Norma Jiménez Preciado", birthDate: "1980-08-13", municipality: "Gómez Farías", phone4: "6512", affiliation: "IMSS", jornada: 1, services: ["citologia"] },
  { name: "Elena Ramírez del Toro", birthDate: "1991-03-28", municipality: "Tuxpan", phone4: "7623", affiliation: "ninguno", jornada: 0, services: ["citologia"] },
  { name: "Isabel Torres Macías", birthDate: "1968-11-04", municipality: "Tapalpa", phone4: "8734", affiliation: "INSABI", jornada: 1, services: ["citologia", "mama"] },
  { name: "Beatriz Luna Arreola", birthDate: "1974-05-07", municipality: "Zapotitlán de Vadillo", phone4: "9845", affiliation: "ISSSTE", jornada: 2, services: ["mama"] },
  { name: "Rocío Mendoza Guzmán", birthDate: "1987-07-31", municipality: "Tamazula de Gordiano", phone4: "1956", affiliation: "IMSS", jornada: 3, services: ["citologia"] },
  { name: "Sandra Castillo Ibarra", birthDate: "1979-01-26", municipality: "Sayula", phone4: "2067", affiliation: "ninguno", jornada: 1, services: ["citologia"] },
  { name: "Ma. de los Ángeles Robles Haro", birthDate: "1964-09-17", municipality: "Tecalitlán", phone4: "3178", affiliation: "INSABI", jornada: 3, services: ["mama"] },
  { name: "Martha Salazar Cervantes", birthDate: "1970-04-02", municipality: "Tonila", phone4: "4289", affiliation: "SEMAR", jornada: 0, services: ["citologia", "mama"] },
  { name: "Yolanda Herrera Pulido", birthDate: "1957-12-24", municipality: "Zapotlán el Grande", phone4: "5390", affiliation: "ISSSTE", jornada: 2, services: ["mama"] },
  { name: "Diana Campos Velasco", birthDate: "1995-06-10", municipality: "Gómez Farías", phone4: "6401", affiliation: "ninguno", jornada: 1, services: ["citologia"] },
  { name: "Mónica Espinoza Ureña", birthDate: "1982-02-15", municipality: "Tuxpan", phone4: "7512", affiliation: "IMSS", jornada: 0, services: ["citologia"] },
  { name: "Laura Fuentes Gallardo", birthDate: "1976-10-29", municipality: "Tapalpa", phone4: "8623", affiliation: "INSABI", jornada: 1, services: ["citologia", "mama"] },
  { name: "Guadalupe Medina Partida", birthDate: "1963-08-06", municipality: "Zapotitlán de Vadillo", phone4: "9734", affiliation: "otro", jornada: 2, services: ["mama"] },
];

const pad = (n: number, w = 3) => String(n).padStart(w, "0");
// UTC like `new Date().toISOString()`, so (at, id) ordering stays lexical; 15:00Z is 09:00 in Jalisco.
const ts = (date: string, minute: number) => `${date}T${pad(15 + Math.floor(minute / 60), 2)}:${pad(minute % 60, 2)}:00.000Z`;

const age = (birthDate: string, on: string) => {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [y, m, d] = on.split("-").map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
};

/** Seed patients (1-based) with results that need follow-up, so the Seguimiento list is not empty (ISS-0022). */
const SEED_FOLLOW_UP: Record<number, { cito?: string; mama?: { birads: 0 | 3; followUp: "imagen_complementaria" | "evaluacion_6_meses" } }> = {
  6: { mama: { birads: 3, followUp: "evaluacion_6_meses" } },
  9: { mama: { birads: 0, followUp: "imagen_complementaria" } },
  14: { cito: "ASC-US (células escamosas atípicas de significado indeterminado)" },
};

/** Deterministic seed events (same output on every call and every device). */
export function seedEvents(): AnyEvent[] {
  const events: AnyEvent[] = [];
  const finalCounter: Record<string, number> = {};

  PATIENTS.forEach((sp, i) => {
    const num = i + 1;
    const patientId = `seed-patient-${pad(num)}`;
    const jornada = JORNADAS[sp.jornada];
    const year = jornada.date.slice(0, 4);
    let seq = 0;
    let minute = i * 7;
    const opts = () => ({ id: `seed-${pad(num)}-${pad(++seq, 2)}`, at: ts(jornada.date, minute++) });
    const at = (a: Actor): Actor => ({ ...a, jornadaId: jornada.id });

    const identity: Identity = {
      fullName: sp.name,
      birthDate: sp.birthDate,
      birthState: i % 9 === 4 ? "Colima" : "Jalisco",
      residence: `Calle ${["Hidalgo", "Morelos", "Juárez", "Allende", "Independencia"][i % 5]} ${10 + i}`,
      municipality: sp.municipality,
      phone: `341555${sp.phone4}`,
      affiliation: sp.affiliation,
      affiliationNumber: sp.affiliation === "IMSS" || sp.affiliation === "ISSSTE" ? `FIC-${pad(num, 6)}` : undefined,
      hasCartilla: i % 3 !== 2,
    };
    const provisionalFolio = `${SEED_DEVICE}-${pad(num, 4)}`;
    events.push(newEvent("patient.created", patientId, { identity, provisionalFolio }, at(capturista), opts()));
    events.push(newEvent("privacy.accepted", patientId, { noticeVersion: "2025-08", acceptedOn: jornada.date }, at(capturista), opts()));
    events.push(
      newEvent(
        "history.confirmed",
        patientId,
        {
          history: {
            menarcheAge: 11 + (i % 4),
            menopauseAge: age(sp.birthDate, jornada.date) > 52 ? 48 + (i % 5) : undefined,
            familyBreastCancer: i % 6 === 0 ? ["madre"] : [],
            hpvVaccinated: i % 5 === 0,
            sexuallyActive: true,
            sexualDebutAge: 16 + (i % 6),
          },
        },
        at(medico),
        opts(),
      ),
    );

    const visitId = `seed-visit-${pad(num)}`;
    events.push(
      newEvent(
        "visit.recorded",
        patientId,
        {
          visitId,
          site: jornada.site,
          date: jornada.date,
          heightCm: 150 + (i % 15),
          weightKg: 58 + ((i * 3) % 25),
          bloodPressure: `${110 + (i % 4) * 5}/${70 + (i % 3) * 5}`,
          glucose: 85 + ((i * 7) % 40),
          reason: "Jornada de detección",
        },
        at(capturista),
        opts(),
      ),
    );

    for (const type of sp.services) {
      const serviceId = `seed-service-${pad(num)}-${type}`;
      if (type === "citologia") {
        const fields: CitologiaFields = {
          citologyKind: "primera_vez",
          gynecoObstetricStatus: age(sp.birthDate, jornada.date) > 52 ? ["posmenopausia"] : ["ninguno"],
          cervixObservation: ["aparentemente_sano"],
          riskFactors: i % 4 === 0 ? ["tabaquismo"] : [],
          repeatedSample: false,
        };
        const cytologyNumber = `CIT-${year}-${pad(num, 4)}`;
        events.push(newEvent("service.recorded", patientId, { serviceId, visitId, serviceType: "citologia", fields, takenByLicense: "FIC-1234567", cytologyNumber }, at(medico), opts()));
        const abnormal = SEED_FOLLOW_UP[num]?.cito;
        events.push(newEvent("result.recorded", patientId, abnormal
          ? { serviceId, bethesda: abnormal, followUp: "evaluacion_6_meses", repeatStudy: true }
          : { serviceId, bethesda: "Negativo para lesión intraepitelial o malignidad", followUp: "rutina_1_anio", repeatStudy: false }, at(patologo), opts()));
      } else {
        const hadMammogram = age(sp.birthDate, jornada.date) >= 40 && i % 2 === 0;
        const fields: MamaFields = {
          consultReason: "Revisión de rutina",
          previousMammogram: hadMammogram,
          lastMammogramDate: hadMammogram ? `${Number(year) - 1}-0${1 + (i % 9)}-15` : undefined,
          lastMammogramResult: hadMammogram ? "BIRADS 1" : undefined,
          clinicalExam: "Sin hallazgos a la exploración",
          thermography: "simetrico",
        };
        events.push(newEvent("service.recorded", patientId, { serviceId, visitId, serviceType: "mama", fields }, at(medico), opts()));
        const special = SEED_FOLLOW_UP[num]?.mama;
        events.push(newEvent("result.recorded", patientId, special
          ? { serviceId, birads: special.birads, followUp: special.followUp }
          : { serviceId, birads: i % 7 === 3 ? 2 : 1, followUp: "rutina_1_anio" }, at(medico), opts()));
      }
    }

    // Past patients were already synced: they carry a final folio.
    finalCounter[year] = (finalCounter[year] ?? 0) + 1;
    events.push(newEvent("folio.assigned", patientId, { folio: `${year}-${pad(finalCounter[year] + 100, 4)}`, provisionalFolio }, at(capturista), opts()));
  });

  // One contact change, so the timeline demo has field history.
  const p3 = "seed-patient-003";
  events.push(
    newEvent(
      "field.updated",
      p3,
      { field: "identity.phone", value: "3415550999", prev: "seed-003-01" },
      { ...capturista, jornadaId: JORNADAS[2].id },
      { id: "seed-003-90", at: ts(JORNADAS[2].date, 300) },
    ),
  );

  return events;
}

/** Fictitious patient id of the demo patient "María Ejemplo" (Pap smear in February 2026). */
export const SEED_MARIA_EJEMPLO = "seed-patient-001";
/** Fictitious patient id of "María Ejemplar" (similar name, different person). */
export const SEED_MARIA_EJEMPLAR = "seed-patient-002";

/** Loads the seed when the store is empty. Returns how many events were added (0 if it had data). */
export async function seedIfEmpty(store: EventStore): Promise<number> {
  const { events } = await store.list(0);
  if (events.length > 0) return 0;
  return store.append(seedEvents());
}

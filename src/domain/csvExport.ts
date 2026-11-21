// ISS-0016: aggregate CSV for reports and interoperability. Counts only: no names, phones, folios,
// birth dates, results or diagnoses (EIRA limit: exports never carry diagnoses or personal data).
import type { ServiceType } from "./events";
import type { RecordsModel } from "./projection";

export interface CountRow {
  /** YYYY-MM of the visit date. */
  month: string;
  site: string;
  service: ServiceType;
  services: number;
  /** Distinct patients, counting linked records (confirmed duplicates) once. */
  patients: number;
}

const SERVICE_LABEL: Record<ServiceType, string> = { citologia: "citologia", mama: "revision_mamaria" };

/** Counts of services and unique patients by month, site and service type. Deterministic order. */
export function countsByMonthSiteService(model: RecordsModel): CountRow[] {
  const groups = new Map<string, { row: CountRow; ids: Set<string> }>();
  for (const id of model.activeIds) {
    const record = model.patients[id];
    // A survivor's visits include its linked aliases': counting by survivor id merges confirmed duplicates.
    for (const v of record.visits) {
      for (const s of v.services) {
        const month = v.date.slice(0, 7);
        const site = v.site.trim();
        const key = `${month}\u0000${site}\u0000${s.serviceType}`;
        let g = groups.get(key);
        if (!g) {
          g = { row: { month, site, service: s.serviceType, services: 0, patients: 0 }, ids: new Set() };
          groups.set(key, g);
        }
        g.row.services++;
        g.ids.add(id);
      }
    }
  }
  return [...groups.values()]
    .map((g) => ({ ...g.row, patients: g.ids.size }))
    .sort((a, b) => a.month.localeCompare(b.month) || a.site.localeCompare(b.site, "es") || a.service.localeCompare(b.service));
}

function cell(v: string | number): string {
  const s = String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_HEADER = ["mes", "sede", "servicio", "servicios", "pacientes_unicas"];

/** CSV text with a UTF-8 BOM so Excel shows accents. */
export function countsCsv(rows: CountRow[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const r of rows) lines.push([r.month, r.site, SERVICE_LABEL[r.service], r.services, r.patients].map(cell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

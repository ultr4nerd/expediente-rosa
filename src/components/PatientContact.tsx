// ISS-0011: contact data that changes over time. Each change is a field.updated event with `prev`;
// the previous values stay visible with who changed them and when (records are never overwritten).
import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { CircleAlert, History, Pencil, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEMO_USERS, useSession } from "@/app/session";
import { useRecords } from "@/app/useRecords";
import type { AnyEvent } from "@/domain/events";
import { newEvent } from "@/domain/factory";
import { digitsOnly } from "@/domain/identity";
import type { PatientRecord } from "@/domain/projection";
import { isTauri } from "@/platform";
import { deviceInfo } from "@/platform/tauri";
import { cn } from "@/lib/utils";

type ContactField = "phone" | "phoneAlt" | "email";

const FIELDS: { key: ContactField; label: string; lower: string; inputMode: "numeric" | "email" }[] = [
  { key: "phone", label: "Teléfono", lower: "teléfono", inputMode: "numeric" },
  { key: "phoneAlt", label: "Otro teléfono", lower: "otro teléfono", inputMode: "numeric" },
  { key: "email", label: "Correo electrónico", lower: "correo", inputMode: "email" },
];

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "21 nov 2026, 12:40" in local time. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

export const authorName = (id: string) => DEMO_USERS.find((u) => u.id === id)?.name ?? id;

export const formatPhone = (p: string) =>
  p.length === 10 ? `${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6)}` : p;

const show = (field: ContactField, v: unknown) =>
  typeof v === "string" && v ? (field === "email" ? v : formatPhone(v)) : "Sin registro";

interface HistoryItem {
  value: unknown;
  at: string;
  author: string;
  initial: boolean;
  conflict: boolean;
}

/** Values of one identity field, newest first: every change plus the value from the registration. */
function historyOf(record: PatientRecord, events: AnyEvent[], field: ContactField): HistoryItem[] {
  const path = `identity.${field}`;
  const changes = record.fieldHistory
    .filter((c) => c.field === path)
    .map((c) => ({ value: c.value, at: c.at, author: c.author, initial: false, conflict: c.conflict }));
  const created = record.created && events.find((e) => e.id === record.created!.eventId);
  const initial: HistoryItem[] =
    created && created.type === "patient.created"
      ? [{ value: created.payload.identity[field], at: created.at, author: created.author, initial: true, conflict: false }]
      : [];
  return [...initial, ...changes].reverse();
}

function validate(field: ContactField, raw: string): { value: string | null; error?: string } {
  const v = raw.trim();
  if (!v) return { value: null };
  if (field === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ? { value: v }
      : { value: null, error: "El correo no parece válido. Revisa la @ y el dominio." };
  }
  const d = digitsOnly(v);
  return d.length === 10 ? { value: d } : { value: null, error: "El teléfono debe tener 10 dígitos." };
}

export function PatientContact({ record }: { record: PatientRecord }) {
  const { model, append } = useRecords();
  const { user, jornadaId } = useSession();
  const [editing, setEditing] = useState<ContactField | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [openHistory, setOpenHistory] = useState<Set<ContactField>>(new Set());

  function start(field: ContactField) {
    const current = record.identity[field];
    setEditing(field);
    setDraft(typeof current === "string" ? current : "");
    setError(undefined);
  }

  async function save(field: ContactField) {
    if (saving || !user) return;
    const { value, error } = validate(field, draft);
    if (error) { setError(error); return; }
    const current = (record.identity[field] as string | undefined) ?? null;
    if (value === current) { setEditing(null); return; }
    setSaving(true);
    try {
      const path = `identity.${field}`;
      const last = [...record.fieldHistory].reverse().find((c) => c.field === path);
      const prev = last?.eventId ?? record.created?.eventId ?? null;
      const device = isTauri ? (await deviceInfo().catch(() => ({ device: "A" }))).device : "A";
      await append([
        newEvent("field.updated", record.patientId, { field: path, value, prev }, { device, author: user.id, role: user.role, jornadaId }),
      ]);
      const label = FIELDS.find((f) => f.key === field)!.label;
      toast.success(`${label} actualizado. El anterior queda en el historial.`);
      setEditing(null);
      setOpenHistory((s) => new Set(s).add(field));
    } catch {
      toast.error("No se pudo guardar el cambio. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>, field: ContactField) {
    if (e.key === "Enter") { e.preventDefault(); void save(field); }
    if (e.key === "Escape") { e.preventDefault(); setEditing(null); }
  }

  return (
    <section aria-labelledby="contact-title" className="flex flex-col gap-md rounded-xl border bg-card p-lg shadow-sm">
      <h2 id="contact-title" className="type-heading">Contacto</h2>
      <ul className="flex flex-col divide-y">
        {FIELDS.map(({ key, label, lower, inputMode }) => {
          const history = historyOf(record, model.events, key);
          const changes = history.filter((h) => !h.initial).length;
          const hasConflict = history.some((h) => h.conflict);
          const inputId = `contact-${key}`;
          return (
            <li key={key} className="flex flex-col gap-sm py-md first:pt-0 last:pb-0">
              {editing === key ? (
                <div className="flex flex-col gap-sm">
                  <label htmlFor={inputId} className="type-label">{label}</label>
                  <div className="flex flex-wrap gap-sm">
                    <Input
                      id={inputId}
                      autoFocus
                      inputMode={inputMode}
                      type={key === "email" ? "email" : "tel"}
                      autoComplete="off"
                      className="min-w-0 flex-1"
                      value={draft}
                      onChange={(e) => { setDraft(e.target.value); setError(undefined); }}
                      onKeyDown={(e) => onKey(e, key)}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? `${inputId}-error` : `${inputId}-hint`}
                    />
                    <Button onClick={() => save(key)} disabled={saving}>Guardar</Button>
                    <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                  </div>
                  {error ? (
                    <p id={`${inputId}-error`} className="flex items-center gap-xs type-caption text-danger">
                      <CircleAlert className="size-4 shrink-0" aria-hidden="true" />{error}
                    </p>
                  ) : (
                    <p id={`${inputId}-hint`} className="type-caption text-muted-foreground">
                      Enter guarda, Esc cancela. El valor anterior no se borra: queda en el historial.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-md">
                  <div className="flex flex-col">
                    <span className="type-caption text-muted-foreground">{label}</span>
                    <span className={cn("type-body-strong", !record.identity[key] && "font-normal text-muted-foreground")}>
                      {show(key, record.identity[key])}
                    </span>
                  </div>
                  <Button variant="ghost" onClick={() => start(key)} aria-label={`Cambiar ${lower}`}>
                    <Pencil aria-hidden="true" />Cambiar
                  </Button>
                </div>
              )}

              {hasConflict && (
                <p role="status" className="flex items-center gap-sm rounded-md bg-warning-subtle p-sm type-caption text-on-warning-subtle">
                  <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
                  Dos laptops cambiaron este dato sin verse. Confirma con la paciente cuál es el correcto.
                </p>
              )}

              {changes > 0 && (
                <div className="flex flex-col gap-xs">
                  <button
                    type="button"
                    className="flex w-fit items-center gap-xs rounded-sm type-caption text-brand-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    aria-expanded={openHistory.has(key)}
                    aria-controls={`${inputId}-history`}
                    onClick={() => setOpenHistory((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; })}
                  >
                    <History className="size-4" aria-hidden="true" />
                    {openHistory.has(key) ? "Ocultar historial" : `Ver historial (${changes} ${changes === 1 ? "cambio" : "cambios"})`}
                  </button>
                  {openHistory.has(key) && (
                    <ol id={`${inputId}-history`} className="flex flex-col gap-xs border-l-2 pl-md">
                      {history.map((h, i) => (
                        <li key={`${h.at}-${i}`} className="flex flex-col">
                          <span className={cn(i === 0 ? "type-body-strong" : "text-muted-foreground")}>
                            {show(key, h.value)}
                            {i === 0 && <span className="type-caption font-normal text-muted-foreground"> · actual</span>}
                          </span>
                          <span className="type-caption text-muted-foreground">
                            {h.initial ? "Registro inicial" : "Cambio"} · {authorName(h.author)} · {formatDateTime(h.at)}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}


// ISS-0008: patient registration. One identity block for both forms (citología and revisión mamaria),
// live age, privacy notice and provisional folio. Writes patient.created + privacy.accepted.
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { CircleAlert, Hash, Save, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigation } from "@/app/navigation";
import { useSession } from "@/app/session";
import { recordsSource } from "@/app/useRecords";
import type { Affiliation } from "@/domain/events";
import { newEvent, nextProvisionalFolio, type Actor } from "@/domain/factory";
import {
  ADULT_AGE,
  PRIVACY_NOTICE_VERSION,
  ageOn,
  birthDateFromMask,
  emptyDraft,
  maskBirthDate,
  toIdentity,
  validateIdentity,
  type IdentityDraft,
  type IdentityField,
} from "@/domain/identity";
import { isTauri, platform } from "@/platform";
import { ContingencyIntake, emptyPaperIntake, paperIntakeError } from "@/components/ContingencyIntake";
import { normalizePaperFolio, paperIntakeEvent } from "@/domain/contingency";
import { deviceInfo } from "@/platform/tauri";
import { cn } from "@/lib/utils";

const STATES = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua",
  "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero",
  "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla",
  "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas",
  "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas", "Nacida en el extranjero",
];

const AFFILIATIONS: { value: Affiliation; label: string }[] = [
  { value: "INSABI", label: "INSABI / IMSS-Bienestar" },
  { value: "IMSS", label: "IMSS" },
  { value: "ISSSTE", label: "ISSSTE" },
  { value: "PEMEX", label: "PEMEX" },
  { value: "SEDENA", label: "SEDENA" },
  { value: "SEMAR", label: "SEMAR" },
  { value: "ninguno", label: "Ninguna" },
  { value: "otro", label: "Otra" },
];

/** Form order: also the order we focus the first error in. */
const FIELD_ORDER: IdentityField[] = [
  "fullName", "birthDate", "birthState", "residence", "municipality",
  "phone", "phoneAlt", "email", "affiliation", "affiliationNumber", "hasCartilla",
];

const fieldId = (f: IdentityField | "privacy") => `pn-${f}`;

/** Device letter for provisional folios: from Rust in the desktop app, "A" in the browser. */
async function loadDevice(): Promise<string> {
  if (!isTauri) return "A";
  try {
    return (await deviceInfo()).device || "A";
  } catch {
    return "A";
  }
}

/** Reads the store itself (not the cached model) so the folio is never stale. */
async function computeFolio(device: string) {
  const { events } = await platform.store.list();
  return nextProvisionalFolio(events, device);
}

export function PatientNewScreen() {
  const { user, jornadaId } = useSession();
  const { go } = useNavigation();
  const [draft, setDraft] = useState<IdentityDraft>(emptyDraft);
  const [birthText, setBirthText] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [paper, setPaper] = useState(emptyPaperIntake);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState<string | null>(null);
  const [folio, setFolio] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let alive = true;
    loadDevice()
      .then(async (d) => {
        const f = await computeFolio(d);
        if (alive) { setDevice(d); setFolio(f); }
      })
      .catch(() => alive && setFolio(null));
    document.getElementById(fieldId("fullName"))?.focus();
    return () => { alive = false; };
  }, []);

  const errors = useMemo(() => validateIdentity(draft), [draft]);
  const privacyError = !privacy ? "La paciente debe aceptar el aviso de privacidad para registrarla." : undefined;
  const age = draft.birthDate ? ageOn(draft.birthDate) : null;
  const ageValid = age !== null && !errors.birthDate;

  /** Errors are shown after the first save attempt; the birth date one as soon as the date is complete. */
  const shown = (f: IdentityField) =>
    submitted || (f === "birthDate" && birthText.length === 10) ? errors[f] : undefined;

  const set = <K extends IdentityField>(k: K, v: IdentityDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  async function save(e?: FormEvent) {
    e?.preventDefault();
    if (saving) return;
    setSubmitted(true);
    const first = FIELD_ORDER.find((f) => errors[f]);
    if (first || privacyError || paperIntakeError(paper)) {
      const target = first ? fieldId(first) : privacyError ? fieldId("privacy") : "pn-paperFolio";
      document.getElementById(target)?.focus();
      toast.error("Faltan datos o hay algo que revisar. Te llevé al primer campo.");
      return;
    }
    if (!user || !device) return;
    setSaving(true);
    try {
      const actor: Actor = { device, author: user.id, role: user.role, jornadaId };
      // Recompute right before writing: another capture may have happened since the screen opened.
      const provisionalFolio = await computeFolio(device);
      const patientId = crypto.randomUUID();
      const now = new Date().toISOString();
      // Through the shared records source so search and the patient screen see her immediately.
      await recordsSource().append([
        newEvent("patient.created", patientId, { identity: toIdentity(draft), provisionalFolio }, actor, { at: now }),
        newEvent("privacy.accepted", patientId, { noticeVersion: PRIVACY_NOTICE_VERSION, acceptedOn: now.slice(0, 10) }, actor, { at: now }),
        // ISS-0018: typed in from a paper contingency sheet.
        ...(paper.fromPaper ? [paperIntakeEvent(patientId, normalizePaperFolio(paper.paperFolio)!, actor, now)] : []),
      ]);
      toast.success(`Paciente registrada con folio provisional ${provisionalFolio}.`);
      go({ name: "patient", patientId });
    } catch {
      toast.error("No se pudo guardar. Tus datos siguen aquí: intenta de nuevo.");
      setSaving(false);
    }
  }

  // Ctrl+S / Ctrl+Enter save from anywhere on the screen (Enter inside a field also submits).
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && (ev.key === "s" || ev.key === "Enter")) {
        ev.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const noAffiliationNumber = draft.affiliation === "ninguno" || draft.affiliation === "";

  return (
    <section className="mx-auto flex w-full max-w-prose flex-col gap-lg">
      <header className="flex flex-wrap items-start justify-between gap-md">
        <div className="flex flex-col gap-xs">
          <h1 className="type-title">Nueva paciente</h1>
          <p className="text-muted-foreground">
            Identidad una sola vez: sirve para citología y revisión mamaria.
          </p>
        </div>
        <ProvisionalFolio folio={folio} />
      </header>

      <form ref={formRef} onSubmit={save} noValidate className="flex flex-col gap-lg">
        <ContingencyIntake value={paper} onChange={setPaper} showError={submitted} />
        <Group title="Identidad">
          <Field id={fieldId("fullName")} label="Nombre completo" error={shown("fullName")}>
            <Input
              id={fieldId("fullName")}
              autoComplete="off"
              placeholder="Ej. María Guadalupe Hernández López"
              value={draft.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              {...invalid(fieldId("fullName"), shown("fullName"))}
            />
          </Field>

          <div className="grid gap-md sm:grid-cols-2">
            <Field
              id={fieldId("birthDate")}
              label="Fecha de nacimiento"
              error={shown("birthDate")}
              aside={ageValid ? <AgeChip age={age} /> : null}
            >
              <Input
                id={fieldId("birthDate")}
                inputMode="numeric"
                autoComplete="off"
                placeholder="DD/MM/AAAA"
                maxLength={10}
                className="type-folio"
                value={birthText}
                onChange={(e) => {
                  const masked = maskBirthDate(e.target.value);
                  setBirthText(masked);
                  set("birthDate", birthDateFromMask(masked));
                }}
                {...invalid(fieldId("birthDate"), shown("birthDate"))}
              />
            </Field>
            <Field id={fieldId("birthState")} label="Entidad de nacimiento" error={shown("birthState")}>
              <Select value={draft.birthState} onValueChange={(v) => set("birthState", v)}>
                <SelectTrigger
                  id={fieldId("birthState")}
                  className="w-full"
                  {...invalid(fieldId("birthState"), shown("birthState"))}
                >
                  <SelectValue placeholder="Elige o escribe la inicial" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {ageValid && age !== null && age < ADULT_AGE && (
            <p role="status" className="flex items-center gap-sm rounded-md bg-warning-subtle p-sm type-caption text-on-warning-subtle">
              <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
              Es menor de edad ({age} años). Confirma la fecha y que viene acompañada.
            </p>
          )}

          <div className="grid gap-md sm:grid-cols-2">
            <Field id={fieldId("residence")} label="Residencia habitual" error={shown("residence")}>
              <Input
                id={fieldId("residence")}
                autoComplete="off"
                placeholder="Localidad, colonia o barrio"
                value={draft.residence}
                onChange={(e) => set("residence", e.target.value)}
                {...invalid(fieldId("residence"), shown("residence"))}
              />
            </Field>
            <Field id={fieldId("municipality")} label="Municipio" error={shown("municipality")}>
              <Input
                id={fieldId("municipality")}
                autoComplete="off"
                value={draft.municipality}
                onChange={(e) => set("municipality", e.target.value)}
                {...invalid(fieldId("municipality"), shown("municipality"))}
              />
            </Field>
          </div>
        </Group>

        <Group title="Contacto" hint="Opcional, pero ayuda a entregar resultados.">
          <div className="grid gap-md sm:grid-cols-2">
            <Field id={fieldId("phone")} label="Teléfono" error={shown("phone")}>
              <Input
                id={fieldId("phone")}
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                placeholder="10 dígitos"
                value={draft.phone}
                onChange={(e) => set("phone", e.target.value)}
                {...invalid(fieldId("phone"), shown("phone"))}
              />
            </Field>
            <Field id={fieldId("phoneAlt")} label="Otro teléfono" error={shown("phoneAlt")}>
              <Input
                id={fieldId("phoneAlt")}
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Familiar o vecina"
                value={draft.phoneAlt}
                onChange={(e) => set("phoneAlt", e.target.value)}
                {...invalid(fieldId("phoneAlt"), shown("phoneAlt"))}
              />
            </Field>
          </div>
          <Field id={fieldId("email")} label="Correo electrónico" error={shown("email")}>
            <Input
              id={fieldId("email")}
              type="email"
              autoComplete="off"
              value={draft.email}
              onChange={(e) => set("email", e.target.value)}
              {...invalid(fieldId("email"), shown("email"))}
            />
          </Field>
        </Group>

        <Group title="Afiliación y Cartilla EIRA">
          <div className="grid gap-md sm:grid-cols-2">
            <Field id={fieldId("affiliation")} label="Afiliación a servicios de salud" error={shown("affiliation")}>
              <Select value={draft.affiliation} onValueChange={(v) => set("affiliation", v as Affiliation)}>
                <SelectTrigger
                  id={fieldId("affiliation")}
                  className="w-full"
                  {...invalid(fieldId("affiliation"), shown("affiliation"))}
                >
                  <SelectValue placeholder="Elige una opción" />
                </SelectTrigger>
                <SelectContent>
                  {AFFILIATIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field id={fieldId("affiliationNumber")} label="Número de afiliación">
              <Input
                id={fieldId("affiliationNumber")}
                autoComplete="off"
                disabled={noAffiliationNumber}
                placeholder={draft.affiliation === "ninguno" ? "No aplica" : "Si lo tiene a la mano"}
                value={noAffiliationNumber ? "" : draft.affiliationNumber}
                onChange={(e) => set("affiliationNumber", e.target.value)}
              />
            </Field>
          </div>
          <fieldset
            className="flex flex-col gap-sm"
            aria-describedby={shown("hasCartilla") ? `${fieldId("hasCartilla")}-error` : undefined}
          >
            <legend className="type-label mb-sm">¿Cuenta con Cartilla EIRA?</legend>
            <div className="flex gap-sm" role="radiogroup">
              {(["si", "no"] as const).map((v, i) => (
                <label
                  key={v}
                  className={cn(
                    "flex h-control min-w-24 cursor-pointer items-center justify-center gap-sm rounded-md border px-md type-label",
                    "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                    draft.hasCartilla === v
                      ? "border-primary bg-secondary text-secondary-foreground"
                      : "border-input bg-card hover:bg-accent",
                    shown("hasCartilla") && "border-destructive",
                  )}
                >
                  <input
                    id={i === 0 ? fieldId("hasCartilla") : undefined}
                    type="radio"
                    name="hasCartilla"
                    value={v}
                    checked={draft.hasCartilla === v}
                    onChange={() => set("hasCartilla", v)}
                    className="size-4 accent-primary"
                  />
                  {v === "si" ? "Sí" : "No"}
                </label>
              ))}
            </div>
            <FieldError id={`${fieldId("hasCartilla")}-error`} message={shown("hasCartilla")} />
          </fieldset>
        </Group>

        <Group title="Aviso de privacidad">
          <div className="flex flex-col gap-sm rounded-md bg-muted p-md">
            <p className="type-caption text-muted-foreground">
              Explícale a la paciente que EIRA guarda sus datos para darle seguimiento, cifrados en esta laptop,
              y que no se comparten sin su permiso. Versión del aviso: {PRIVACY_NOTICE_VERSION}.
            </p>
            <label
              className={cn(
                "flex min-h-control cursor-pointer items-center gap-md rounded-md border bg-card px-md py-sm",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                submitted && privacyError ? "border-destructive" : privacy ? "border-primary" : "border-input",
              )}
            >
              <input
                id={fieldId("privacy")}
                type="checkbox"
                checked={privacy}
                onChange={(e) => setPrivacy(e.target.checked)}
                className="size-5 shrink-0 accent-primary"
                aria-invalid={submitted && privacyError ? true : undefined}
                aria-describedby={submitted && privacyError ? `${fieldId("privacy")}-error` : undefined}
              />
              <span className="flex items-center gap-sm">
                <ShieldCheck className="size-5 shrink-0 text-brand-text" aria-hidden="true" />
                La paciente leyó o escuchó el aviso de privacidad y lo acepta.
              </span>
            </label>
            <FieldError id={`${fieldId("privacy")}-error`} message={submitted ? privacyError : undefined} />
          </div>
        </Group>

        <footer className="flex flex-wrap items-center justify-between gap-md border-t bg-background px-md py-md">
          <p className="type-caption text-muted-foreground">
            <kbd className="rounded-sm border bg-card px-xs">Enter</kbd> o{" "}
            <kbd className="rounded-sm border bg-card px-xs">Ctrl</kbd>+<kbd className="rounded-sm border bg-card px-xs">S</kbd> para guardar
          </p>
          <div className="flex gap-sm">
            <Button type="button" variant="ghost" onClick={() => go({ name: "search" })}>Cancelar</Button>
            <Button type="submit" size="lg" disabled={saving || !folio}>
              <Save aria-hidden="true" />
              {saving ? "Guardando…" : "Guardar paciente"}
            </Button>
          </div>
        </footer>
      </form>
    </section>
  );
}

function invalid(id: string, error?: string) {
  return error ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` } : {};
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-md rounded-xl border bg-card p-lg shadow-sm">
      <legend className="sr-only">{title}</legend>
      <div className="flex flex-col gap-xs" aria-hidden="true">
        <h2 className="type-heading">{title}</h2>
        {hint && <p className="type-caption text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </fieldset>
  );
}

function Field({
  id, label, error, aside, children,
}: { id: string; label: string; error?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-sm">
      <div className="flex min-h-6 items-center justify-between gap-sm">
        <Label htmlFor={id}>{label}</Label>
        {aside}
      </div>
      {children}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-center gap-xs type-caption text-danger">
      <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

function AgeChip({ age }: { age: number | null }) {
  return (
    <span aria-live="polite" className="rounded-full bg-secondary px-sm type-caption font-semibold text-secondary-foreground">
      {age} años
    </span>
  );
}

function ProvisionalFolio({ folio }: { folio: string | null }) {
  return (
    <div
      className="flex items-center gap-sm rounded-md border-2 border-dashed border-warning-border bg-warning-subtle px-md py-sm text-on-warning-subtle"
      aria-label={folio ? `Folio provisional ${folio}` : "Calculando folio"}
    >
      <Hash className="size-5" aria-hidden="true" />
      <div className="flex flex-col">
        <span className="type-folio">{folio ?? "…"}</span>
        <span className="type-caption">provisional</span>
      </div>
    </div>
  );
}

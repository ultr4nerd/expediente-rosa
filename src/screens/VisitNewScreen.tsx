// ISS-0010: new visit with citología and revisión mamaria. Identity and history come from the record;
// autofilled fields are marked "Del historial" and confirmed, not re-typed. Writes visit.recorded,
// service.recorded and, when touched, history.confirmed / field.updated.
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowLeft, History, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigation } from "@/app/navigation";
import { canSeeSensitive, useSession } from "@/app/session";
import { useRecords } from "@/app/useRecords";
import type { AnyEvent, CitologiaFields, MamaFields, StableHistory } from "@/domain/events";
import { newEvent, type Actor } from "@/domain/factory";
import { resolvePatient, type PatientRecord, type RecordsModel } from "@/domain/projection";
import {
  CITOLOGY_KIND_LABEL,
  computeAutofill,
  formatDate,
  historyChanges,
  validateVisit,
  visitNumbers,
  type CitologyKind,
  type VisitDraft,
  type VisitField as DraftField,
} from "@/domain/autofill";
import { ageOn } from "@/domain/identity";
import { isTauri } from "@/platform";
import { deviceInfo } from "@/platform/tauri";
import { AutofillBox, ChipGroup, ChoiceGroup, VisitField, VisitGroup, describedBy, type AutofillStatus } from "@/components/VisitFields";
import { VisitHistory, type HistoryMode } from "@/components/VisitHistory";
import { FolioTag } from "@/components/MatchCard";
import { RoleLocked } from "@/components/RoleSensitive";

const todayLocal = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD in local time

async function loadDevice(): Promise<string> {
  if (!isTauri) return "A";
  try {
    return (await deviceInfo()).device || "A";
  } catch {
    return "A";
  }
}

const GYNECO = [
  { value: "ninguno", label: "Ninguno" },
  { value: "embarazo", label: "Embarazo" },
  { value: "puerperio", label: "Puerperio" },
  { value: "lactancia", label: "Lactancia" },
  { value: "posmenopausia", label: "Posmenopausia" },
  { value: "histerectomia", label: "Histerectomía" },
];
const CERVIX = [
  { value: "aparentemente_sano", label: "Aparentemente sano" },
  { value: "cervicitis", label: "Cervicitis" },
  { value: "sangrado", label: "Sangrado" },
  { value: "lesion_visible", label: "Lesión visible" },
  { value: "no_visible", label: "No se observa" },
];
const RISK = [
  { value: "tabaquismo", label: "Tabaquismo" },
  { value: "vph_previo", label: "VPH previo" },
  { value: "its", label: "ITS" },
  { value: "multiples_parejas", label: "Múltiples parejas" },
  { value: "anticonceptivos", label: "Anticonceptivos hormonales" },
];
const KINDS = (Object.keys(CITOLOGY_KIND_LABEL) as CitologyKind[]).map((k) => ({ value: k, label: CITOLOGY_KIND_LABEL[k] }));

const FIELD_ORDER: DraftField[] = ["site", "date", "heightCm", "weightKg", "bloodPressure", "glucose", "lastMenstrualPeriod", "reason", "lastMammogramDate"];
const fid = (f: string) => `vn-${f}`;

/** Same look as the chip/choice groups in VisitFields, so a selected service reads as selected. */
const serviceClass = (on: boolean) =>
  `flex h-control cursor-pointer items-center gap-sm rounded-md border px-md type-label has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background ${
    on ? "border-primary bg-secondary text-secondary-foreground" : "border-input bg-card hover:bg-accent"}`;

/** Site of the last visit recorded in this jornada (any patient), so the site is typed once per day. */
function siteForJornada(model: RecordsModel, jornadaId: string): string {
  for (let i = model.events.length - 1; i >= 0; i--) {
    const e = model.events[i];
    if (e.type === "visit.recorded" && e.jornadaId === jornadaId) return e.payload.site;
  }
  return "";
}

export function VisitNewScreen({ patientId }: { patientId: string }) {
  const { model, loading, version } = useRecords();
  const record = resolvePatient(model, patientId);
  if (!record) {
    return (
      <section className="flex flex-col gap-md">
        <h1 className="type-title">Nueva visita</h1>
        <p className="text-muted-foreground">{loading || version === 0 ? "Cargando expediente…" : "No encontramos este expediente."}</p>
      </section>
    );
  }
  return <VisitForm key={record.patientId} record={record} model={model} />;
}

export function VisitForm({ record, model }: { record: PatientRecord; model: RecordsModel }) {
  const { user, jornadaId } = useSession();
  const { go } = useNavigation();
  const { append } = useRecords();
  const today = useMemo(todayLocal, []);
  const auto = useMemo(() => computeAutofill(record, today), [record, today]);
  const canSee = user ? canSeeSensitive(user.role) : false;
  const formRef = useRef<HTMLFormElement>(null);

  const [visit, setVisit] = useState<VisitDraft>(() => ({
    site: siteForJornada(model, jornadaId),
    date: today,
    heightCm: "", weightKg: "", bloodPressure: "", glucose: "", lastMenstrualPeriod: "",
    reason: "",
    lastMammogramDate: auto.lastMammogramDate?.value ?? "",
  }));
  const [doCito, setDoCito] = useState(true);
  const [doMama, setDoMama] = useState(false);
  const [cito, setCito] = useState({
    citologyKind: auto.citologyKind.value as CitologyKind,
    gyneco: [] as string[],
    cervix: [] as string[],
    risk: [] as string[],
    repeated: "no" as "si" | "no",
    license: "",
    cytologyNumber: "",
    previousCytologyNumber: auto.previousCytologyNumber?.value ?? "",
  });
  const [mama, setMama] = useState({
    consultReason: "Revisión de rutina",
    previousMammogram: (auto.previousMammogram ? "si" : "") as "si" | "no" | "",
    lastMammogramResult: auto.lastMammogramResult?.value ?? "",
    clinicalExam: "",
    thermography: "" as "simetrico" | "asimetrico" | "",
    ultrasoundNotes: "",
  });
  // Autofill state per field: starts "autofilled" only where the record had a value.
  const [status, setStatus] = useState<Record<string, AutofillStatus>>(() => {
    const s: Record<string, AutofillStatus> = { citologyKind: "autofilled" };
    if (auto.previousCytologyNumber) s.previousCytologyNumber = "autofilled";
    if (auto.previousMammogram) s.previousMammogram = "autofilled";
    if (auto.lastMammogramDate) s.lastMammogramDate = "autofilled";
    if (auto.lastMammogramResult) s.lastMammogramResult = "autofilled";
    return s;
  });
  const [historyMode, setHistoryMode] = useState<HistoryMode>(auto.history ? "pending" : "edit");
  const [history, setHistory] = useState<StableHistory>(() => ({ ...(auto.history?.value ?? {}) }));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const confirm = (k: string) => setStatus((s) => ({ ...s, [k]: "confirmed" }));
  const edited = (k: string) => setStatus((s) => (s[k] ? { ...s, [k]: "edited" } : s));
  const confirmAll = () => {
    setStatus((s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v === "autofilled" ? "confirmed" : v])));
    if (historyMode === "pending" && canSee) setHistoryMode("confirmed");
  };
  const pendingCount = Object.values(status).filter((v) => v === "autofilled").length + (historyMode === "pending" && canSee ? 1 : 0);

  const { errors, warnings } = useMemo(
    () => validateVisit(doMama ? visit : { ...visit, lastMammogramDate: "" }, { today, birthDate: record.identity.birthDate }),
    [visit, doMama, today, record.identity.birthDate],
  );
  const err = (f: DraftField) => (submitted || f === "date" ? errors[f] : undefined);
  const setV = (k: DraftField, v: string) => setVisit((d) => ({ ...d, [k]: v }));

  useEffect(() => {
    document.getElementById(fid("heightCm"))?.focus();
  }, []);

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

  async function save(e?: FormEvent) {
    e?.preventDefault();
    if (saving) return;
    setSubmitted(true);
    const first = FIELD_ORDER.find((f) => errors[f]);
    if (first) {
      document.getElementById(fid(first))?.focus();
      toast.error("Hay datos que revisar. Te llevé al primer campo.");
      return;
    }
    if (!doCito && !doMama) {
      toast.error("Elige al menos un servicio: citología o revisión mamaria.");
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      const actor: Actor = { device: await loadDevice(), author: user.id, role: user.role, jornadaId };
      const at = new Date().toISOString();
      const pid = record.patientId;
      const visitId = crypto.randomUUID();
      const events: AnyEvent[] = [
        newEvent("visit.recorded", pid, {
          visitId,
          site: visit.site.trim(),
          date: visit.date,
          ...visitNumbers(visit),
          bloodPressure: visit.bloodPressure.trim() || undefined,
          lastMenstrualPeriod: visit.lastMenstrualPeriod || undefined,
          reason: visit.reason.trim() || undefined,
        }, actor, { at }),
      ];
      if (doCito) {
        const fields: CitologiaFields = {
          citologyKind: cito.citologyKind,
          gynecoObstetricStatus: cito.gyneco,
          lastMenstrualPeriod: visit.lastMenstrualPeriod || undefined,
          cervixObservation: cito.cervix,
          riskFactors: cito.risk,
          repeatedSample: cito.repeated === "si",
          previousCytologyNumber: cito.previousCytologyNumber.trim() || undefined,
        };
        events.push(newEvent("service.recorded", pid, {
          serviceId: crypto.randomUUID(), visitId, serviceType: "citologia", fields,
          takenByLicense: cito.license.trim() || undefined,
          cytologyNumber: cito.cytologyNumber.trim() || undefined,
        }, actor, { at }));
      }
      if (doMama) {
        const fields: MamaFields = {
          consultReason: mama.consultReason.trim(),
          previousMammogram: mama.previousMammogram === "si",
          lastMammogramDate: mama.previousMammogram === "si" ? visit.lastMammogramDate || undefined : undefined,
          lastMammogramResult: mama.previousMammogram === "si" ? mama.lastMammogramResult.trim() || undefined : undefined,
          clinicalExam: mama.clinicalExam.trim(),
          thermography: mama.thermography || undefined,
          ultrasoundNotes: mama.ultrasoundNotes.trim() || undefined,
        };
        events.push(newEvent("service.recorded", pid, { serviceId: crypto.randomUUID(), visitId, serviceType: "mama", fields }, actor, { at }));
      }
      if (canSee && historyMode !== "pending") {
        for (const c of historyChanges(record, auto.history?.value ?? {}, history)) {
          events.push(newEvent("field.updated", pid, c, actor, { at }));
        }
        if (Object.keys(history).some((k) => history[k as keyof StableHistory] !== undefined)) {
          events.push(newEvent("history.confirmed", pid, { history }, actor, { at }));
        }
      }
      await append(events);
      toast.success(`Visita guardada. ${auto.reusedCount} datos reutilizados del historial.`);
      go({ name: "patient", patientId: pid });
    } catch {
      toast.error("No se pudo guardar. Tus datos siguen aquí: intenta de nuevo.");
      setSaving(false);
    }
  }

  const age = ageOn(record.identity.birthDate);
  const id = record.identity;

  return (
    <section className="mx-auto flex w-full max-w-prose flex-col gap-lg">
      <header className="flex flex-col gap-sm">
        <Button type="button" variant="ghost" className="-ml-md self-start" onClick={() => go({ name: "patient", patientId: record.patientId })}>
          <ArrowLeft aria-hidden="true" />
          Volver al expediente
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-md">
          <div className="flex flex-col gap-xs">
            <h1 className="type-title">Nueva visita</h1>
            <p className="type-body-strong">
              {id.fullName}
              {age !== null && <span className="text-muted-foreground"> · {age} años</span>}
            </p>
            <p className="type-caption text-muted-foreground">
              {id.municipality} · Nació el {formatDate(id.birthDate)} en {id.birthState}
            </p>
          </div>
          <FolioTag folio={record.folio} provisionalFolio={record.provisionalFolio} />
        </div>
        <div role="status" className="flex flex-wrap items-center justify-between gap-sm rounded-md border-l-4 border-autofill-border bg-autofill p-sm text-on-autofill">
          <span className="flex items-center gap-sm type-body-strong">
            <History className="size-5" aria-hidden="true" />
            {auto.reusedCount} datos reutilizados del historial
          </span>
          {pendingCount > 0 && (
            <Button type="button" variant="outline" onClick={confirmAll}>
              Confirmar todo lo del historial ({pendingCount})
            </Button>
          )}
        </div>
      </header>

      <form ref={formRef} onSubmit={save} noValidate className="flex flex-col gap-lg">
        <VisitGroup title="Datos de la visita" hint="La identidad ya está en el expediente: no se vuelve a capturar.">
          <div className="grid gap-md sm:grid-cols-2">
            <VisitField id={fid("site")} label="Sede" error={err("site")}>
              <Input id={fid("site")} autoComplete="off" placeholder="Ej. Zapotitlán, plaza principal" value={visit.site}
                onChange={(e) => setV("site", e.target.value)} {...describedBy(fid("site"), err("site"))} />
            </VisitField>
            <VisitField id={fid("date")} label="Fecha" error={err("date")} warning={warnings.date}>
              <Input id={fid("date")} type="date" max={today} value={visit.date}
                onChange={(e) => setV("date", e.target.value)} {...describedBy(fid("date"), err("date"), warnings.date)} />
            </VisitField>
          </div>
          <div className="grid gap-md sm:grid-cols-2">
            <VisitField id={fid("heightCm")} label="Talla (cm)" error={err("heightCm")} warning={warnings.heightCm}>
              <Input id={fid("heightCm")} inputMode="decimal" autoComplete="off" value={visit.heightCm}
                onChange={(e) => setV("heightCm", e.target.value)} {...describedBy(fid("heightCm"), err("heightCm"), warnings.heightCm)} />
            </VisitField>
            <VisitField id={fid("weightKg")} label="Peso (kg)" error={err("weightKg")} warning={warnings.weightKg}>
              <Input id={fid("weightKg")} inputMode="decimal" autoComplete="off" value={visit.weightKg}
                onChange={(e) => setV("weightKg", e.target.value)} {...describedBy(fid("weightKg"), err("weightKg"), warnings.weightKg)} />
            </VisitField>
            <VisitField id={fid("bloodPressure")} label="Presión arterial" error={err("bloodPressure")} warning={warnings.bloodPressure}>
              <Input id={fid("bloodPressure")} autoComplete="off" placeholder="120/80" value={visit.bloodPressure}
                onChange={(e) => setV("bloodPressure", e.target.value)} {...describedBy(fid("bloodPressure"), err("bloodPressure"), warnings.bloodPressure)} />
            </VisitField>
            <VisitField id={fid("glucose")} label="Glucosa (mg/dL)" error={err("glucose")} warning={warnings.glucose}>
              <Input id={fid("glucose")} inputMode="numeric" autoComplete="off" value={visit.glucose}
                onChange={(e) => setV("glucose", e.target.value)} {...describedBy(fid("glucose"), err("glucose"), warnings.glucose)} />
            </VisitField>
            <VisitField id={fid("lastMenstrualPeriod")} label="FUM (fecha de última menstruación)" error={err("lastMenstrualPeriod")}>
              <Input id={fid("lastMenstrualPeriod")} type="date" max={today} value={visit.lastMenstrualPeriod}
                onChange={(e) => setV("lastMenstrualPeriod", e.target.value)} {...describedBy(fid("lastMenstrualPeriod"), err("lastMenstrualPeriod"))} />
            </VisitField>
            <VisitField id={fid("reason")} label="Motivo de la consulta">
              <Input id={fid("reason")} autoComplete="off" placeholder="Ej. Jornada de detección" value={visit.reason}
                onChange={(e) => setV("reason", e.target.value)} />
            </VisitField>
          </div>
        </VisitGroup>

        <div className="flex flex-wrap items-center gap-sm" role="group" aria-label="Servicios de esta visita">
          <span className="type-label">Servicios:</span>
          <label className={serviceClass(doCito)}>
            <input type="checkbox" className="size-4 accent-primary" checked={doCito} onChange={(e) => setDoCito(e.target.checked)} />
            Citología
          </label>
          <label className={serviceClass(doMama)}>
            <input type="checkbox" className="size-4 accent-primary" checked={doMama} onChange={(e) => setDoMama(e.target.checked)} />
            Revisión mamaria
          </label>
        </div>

        {doCito && (
          <VisitGroup title="Citología: solicitud" hint="Reactivos 11 a 22, versión reducida.">
            <AutofillBox status={status.citologyKind} source={auto.citologyKind.source} onConfirm={() => confirm("citologyKind")}>
              <ChoiceGroup id={fid("citologyKind")} name="citologyKind" legend="11. Tipo de citología" value={cito.citologyKind} options={KINDS}
                onChange={(v) => { setCito((c) => ({ ...c, citologyKind: v })); edited("citologyKind"); }} />
            </AutofillBox>
            <ChipGroup id={fid("gyneco")} legend="12. Estado gineco-obstétrico" options={GYNECO} value={cito.gyneco}
              onChange={(v) => setCito((c) => ({ ...c, gyneco: v }))} />
            <ChipGroup id={fid("cervix")} legend="15. Observación del cuello uterino" options={CERVIX} value={cito.cervix}
              onChange={(v) => setCito((c) => ({ ...c, cervix: v }))} />
            {canSee ? (
              <ChipGroup id={fid("risk")} legend="16. Factores de riesgo" options={RISK} value={cito.risk}
                onChange={(v) => setCito((c) => ({ ...c, risk: v }))} />
            ) : (
              <RoleLocked label="16. Factores de riesgo" />
            )}
            <ChoiceGroup id={fid("repeated")} name="repeated" legend="19. ¿Es muestra repetida?" value={cito.repeated}
              options={[{ value: "no", label: "No" }, { value: "si", label: "Sí" }]} onChange={(v) => setCito((c) => ({ ...c, repeated: v }))} />
            <div className="grid gap-md sm:grid-cols-2">
              <VisitField id={fid("license")} label="21. Cédula de quien toma la muestra">
                <Input id={fid("license")} autoComplete="off" value={cito.license} onChange={(e) => setCito((c) => ({ ...c, license: e.target.value }))} />
              </VisitField>
              <VisitField id={fid("cytologyNumber")} label="22. Número citológico">
                <Input id={fid("cytologyNumber")} autoComplete="off" className="type-folio" value={cito.cytologyNumber}
                  onChange={(e) => setCito((c) => ({ ...c, cytologyNumber: e.target.value }))} />
              </VisitField>
            </div>
            <AutofillBox status={status.previousCytologyNumber} source={auto.previousCytologyNumber?.source} onConfirm={() => confirm("previousCytologyNumber")}>
              <VisitField id={fid("previousCytologyNumber")} label="22.1 Número citológico anterior">
                <Input id={fid("previousCytologyNumber")} autoComplete="off" className="type-folio" placeholder="Sin citología anterior"
                  value={cito.previousCytologyNumber}
                  onChange={(e) => { setCito((c) => ({ ...c, previousCytologyNumber: e.target.value })); edited("previousCytologyNumber"); }} />
              </VisitField>
            </AutofillBox>
          </VisitGroup>
        )}

        {doMama && (
          <VisitGroup title="Revisión mamaria" hint="Reactivos reducidos. Ultrasonido CHISON 5, transductor de 10 MHz.">
            <VisitField id={fid("consultReason")} label="1. Motivo de la consulta">
              <Input id={fid("consultReason")} autoComplete="off" value={mama.consultReason} onChange={(e) => setMama((m) => ({ ...m, consultReason: e.target.value }))} />
            </VisitField>
            <AutofillBox status={status.previousMammogram} source={auto.previousMammogram?.source} onConfirm={() => confirm("previousMammogram")}>
              <ChoiceGroup id={fid("previousMammogram")} name="previousMammogram" legend="16. ¿Mastografía previa?" value={mama.previousMammogram}
                options={[{ value: "si", label: "Sí" }, { value: "no", label: "No" }]}
                onChange={(v) => { setMama((m) => ({ ...m, previousMammogram: v })); edited("previousMammogram"); }} />
            </AutofillBox>
            {mama.previousMammogram === "si" && (
              <div className="grid gap-md sm:grid-cols-2">
                <AutofillBox status={status.lastMammogramDate} source={auto.lastMammogramDate?.source} onConfirm={() => confirm("lastMammogramDate")}>
                  <VisitField id={fid("lastMammogramDate")} label="16.1 Fecha de la última" error={err("lastMammogramDate")}>
                    <Input id={fid("lastMammogramDate")} type="date" max={today} value={visit.lastMammogramDate ?? ""}
                      onChange={(e) => { setV("lastMammogramDate", e.target.value); edited("lastMammogramDate"); }}
                      {...describedBy(fid("lastMammogramDate"), err("lastMammogramDate"))} />
                  </VisitField>
                </AutofillBox>
                <AutofillBox status={status.lastMammogramResult} source={auto.lastMammogramResult?.source} onConfirm={() => confirm("lastMammogramResult")}>
                  <VisitField id={fid("lastMammogramResult")} label="16.2 Resultado">
                    <Input id={fid("lastMammogramResult")} autoComplete="off" placeholder="Ej. BIRADS 1" value={mama.lastMammogramResult}
                      onChange={(e) => { setMama((m) => ({ ...m, lastMammogramResult: e.target.value })); edited("lastMammogramResult"); }} />
                  </VisitField>
                </AutofillBox>
              </div>
            )}
            <VisitField id={fid("clinicalExam")} label="17. Exploración clínica">
              <Input id={fid("clinicalExam")} autoComplete="off" placeholder="Ej. Sin hallazgos a la exploración" value={mama.clinicalExam}
                onChange={(e) => setMama((m) => ({ ...m, clinicalExam: e.target.value }))} />
            </VisitField>
            <ChoiceGroup id={fid("thermography")} name="thermography" legend="22. Termografía" value={mama.thermography}
              options={[{ value: "simetrico", label: "Simétrica" }, { value: "asimetrico", label: "Asimétrica" }]}
              onChange={(v) => setMama((m) => ({ ...m, thermography: v }))} />
            <VisitField id={fid("ultrasoundNotes")} label="23. Notas del ultrasonido">
              <Input id={fid("ultrasoundNotes")} autoComplete="off" value={mama.ultrasoundNotes} onChange={(e) => setMama((m) => ({ ...m, ultrasoundNotes: e.target.value }))} />
            </VisitField>
          </VisitGroup>
        )}

        <VisitHistory
          known={auto.history}
          canSee={canSee}
          mode={historyMode}
          draft={history}
          onConfirm={() => setHistoryMode("confirmed")}
          onEdit={() => setHistoryMode("edit")}
          onChange={setHistory}
        />

        <footer className="flex flex-wrap items-center justify-between gap-md border-t bg-background px-md py-md">
          <p className="type-caption text-muted-foreground">
            <kbd className="rounded-sm border bg-card px-xs">Ctrl</kbd>+<kbd className="rounded-sm border bg-card px-xs">S</kbd> para guardar
            {pendingCount > 0 && <Badge variant="autofill" className="ml-sm">{pendingCount} por confirmar</Badge>}
          </p>
          <div className="flex gap-sm">
            <Button type="button" variant="ghost" onClick={() => go({ name: "patient", patientId: record.patientId })}>Cancelar</Button>
            <Button type="submit" size="lg" disabled={saving}>
              <Save aria-hidden="true" />
              {saving ? "Guardando…" : "Guardar visita"}
            </Button>
          </div>
        </footer>
      </form>
    </section>
  );
}

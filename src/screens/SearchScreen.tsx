// ISS-0009: search before registering. Match cards show why they match; a human decides. Never auto-merges.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Search, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MatchCard } from "@/components/MatchCard";
import { useRecords } from "@/app/useRecords";
import { useNavigation } from "@/app/navigation";
import { useSession } from "@/app/session";
import { newEvent } from "@/domain/factory";
import { looksLikeFolio, matchPatients, searchByFolio, type MatchCandidate } from "@/domain/matching";
import { parseSearchText, prefillFromSearch } from "@/domain/searchQuery";
import { isTauri } from "@/platform";
import { deviceInfo } from "@/platform/tauri";
import estadoVacio from "@/assets/illustrations/estado-vacio.webp";

/** One box, several signals: a folio, or a name plus optional DD/MM/AAAA date and phone digits. */
function search(text: string, candidates: readonly MatchCandidate[]) {
  const t = text.trim();
  if (t.length < 2) return [];
  if (looksLikeFolio(t)) return searchByFolio(t, candidates);
  const query = parseSearchText(t);
  if (!query.fullName && !query.phone && !query.birthDate) return [];
  return matchPatients(query, candidates, { limit: 8 });
}

export function SearchScreen() {
  const { user, jornadaId } = useSession();
  const { go } = useNavigation();
  const { model, version, append } = useRecords();
  const [query, setQuery] = useState("");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const loaded = version > 0;
  const patients = useMemo(() => model.activeIds.map((id) => model.patients[id]), [model]);
  const byId = (id: string) => model.patients[id];

  const results = useMemo(() => {
    const found = search(query, patients);
    const top = found[0]?.candidate;
    // Pairs a human already marked distinct are not suggested as the same person again: they go last, with a note.
    const isDistinctFromTop = (p: MatchCandidate) =>
      !!top && top.patientId !== p.patientId && !!top.distinctFrom?.includes(p.patientId);
    return found
      .map((r) => ({
        reasons: r.reasons,
        patient: r.candidate,
        note: isDistinctFromTop(r.candidate) ? `Ya se confirmó que es otra persona que ${top!.identity.fullName}.` : undefined,
      }))
      .sort((a, b) => Number(!!a.note) - Number(!!b.note));
  }, [query, patients]);

  // A new query starts a new decision.
  useEffect(() => setDismissed(new Set()), [query]);

  async function chooseSame(chosen: MatchCandidate) {
    if (busy) return;
    const others = [...dismissed].filter((id) => id !== chosen.patientId && !chosen.distinctFrom?.includes(id));
    if (others.length && user) {
      setBusy(true);
      try {
        const device = isTauri ? (await deviceInfo().catch(() => ({ device: "A" }))).device : "A";
        const actor = { device, author: user.id, role: user.role, jornadaId };
        await append(
          others.map((otherPatientId) => newEvent("patients.marked_distinct", chosen.patientId, { otherPatientId }, actor)),
        );
        toast.success(
          others.length === 1
            ? `Anotado: ${byId(others[0])?.identity.fullName} es otra persona.`
            : `Anotado: ${others.length} personas distintas.`,
        );
      } catch {
        toast.error("No se pudo anotar que eran personas distintas. Puedes seguir; vuelve a marcarlo después.");
      } finally {
        setBusy(false);
      }
    }
    go({ name: "patient", patientId: chosen.patientId });
  }

  function markOther(id: string) {
    setDismissed((s) => new Set(s).add(id));
    // Keep keyboard users in the list: move to the next card's primary action.
    requestAnimationFrame(() => {
      const next = listRef.current?.querySelector<HTMLButtonElement>("[data-match-primary]");
      (next ?? inputRef.current)?.focus();
    });
  }

  function undo(id: string) {
    setDismissed((s) => { const n = new Set(s); n.delete(id); return n; });
  }

  function onInputKey(e: KeyboardEvent<HTMLInputElement>) {
    // A scanned or pasted folio (QR readers type it and press Enter) with one exact match opens it directly.
    if (e.key === "Enter" && results.length === 1 && looksLikeFolio(query.trim())) {
      e.preventDefault();
      go({ name: "patient", patientId: results[0].patient.patientId });
    } else if ((e.key === "ArrowDown" || e.key === "Enter") && results.length) {
      e.preventDefault();
      listRef.current?.querySelector<HTMLButtonElement>("[data-match-primary]")?.focus();
    } else if (e.key === "Escape") {
      setQuery("");
    }
  }

  function onListKey(e: KeyboardEvent<HTMLUListElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>("[data-match-primary]") ?? [])];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    if (e.key === "ArrowUp" && i === 0) inputRef.current?.focus();
    else buttons[Math.min(buttons.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
  }

  const q = query.trim();
  const visible = results.filter((r) => !dismissed.has(r.patient.patientId));
  // Registration always starts from the search: carry what was typed (name, date, phone).
  const newPatient = () => go({ name: "patient-new", prefill: prefillFromSearch(query, looksLikeFolio) });

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-lg">
      <header className="flex flex-wrap items-end justify-between gap-md">
        <div className="flex flex-col gap-xs">
          <h1 className="type-title">Buscar paciente</h1>
          <p className="text-muted-foreground">Busca antes de registrar: así no se duplican expedientes.</p>
        </div>
        <Button variant="outline" onClick={newPatient}><UserPlus aria-hidden="true" />Registrar nueva paciente</Button>
      </header>

      <div role="search" className="flex flex-col gap-sm">
        <label htmlFor="search-q" className="type-label">Nombre, folio o teléfono</label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-md size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="search-q"
            ref={inputRef}
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="Ej. María Ejemplo, A-0007 o 4567"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            aria-describedby="search-hint"
            className="h-control-lg pl-2xl type-heading"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Borrar búsqueda"
              className="absolute top-1/2 right-xs -translate-y-1/2"
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            >
              <X aria-hidden="true" />
            </Button>
          )}
        </div>
        <p id="search-hint" className="type-caption text-muted-foreground">
          Acepta errores de dedo, acentos y abreviaturas («Ma.»). Puedes añadir la fecha: «María 15/03/1985».
          {results.length > 0 && " Flecha abajo o Enter para ir a los resultados."}
        </p>
      </div>

      <div aria-live="polite" className="sr-only">
        {q.length >= 2 && loaded ? `${visible.length} ${visible.length === 1 ? "coincidencia" : "coincidencias"}` : ""}
      </div>

      {q.length < 2 ? (
        <EmptyState
          title="Empieza por buscarla"
          body={loaded ? `Hay ${patients.length} ${patients.length === 1 ? "paciente" : "pacientes"} en esta laptop. Escribe al menos dos letras, un folio o los últimos 4 dígitos de su teléfono.` : "Cargando expedientes…"}
        />
      ) : results.length === 0 ? (
        <EmptyState
          title="No encontramos a esta paciente."
          body="Regístrala con los datos que ya escribiste."
          action={<Button size="lg" onClick={newPatient}><UserPlus aria-hidden="true" />Registrar nueva paciente</Button>}
        />
      ) : (
        <>
          <ul ref={listRef} onKeyDown={onListKey} className="flex flex-col gap-md" aria-label="Posibles coincidencias">
            {results.map(({ reasons, patient, note }) => (
              <MatchCard
                key={patient.patientId}
                patient={patient}
                reasons={reasons}
                note={note}
                dismissed={dismissed.has(patient.patientId)}
                onSame={() => chooseSame(patient)}
                onOther={() => markOther(patient.patientId)}
                onUndo={() => undo(patient.patientId)}
              />
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-md rounded-xl border border-dashed p-lg">
            <p>Revisa las coincidencias primero. Si ninguna es ella, regístrala con los datos que ya escribiste.</p>
            <Button variant={visible.length === 0 ? "default" : "outline"} size={visible.length === 0 ? "lg" : "default"} onClick={newPatient}>
              <UserPlus aria-hidden="true" />Ninguna es ella: registrar nueva paciente
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-md rounded-xl border bg-card p-xl text-center shadow-sm">
      <img src={estadoVacio} alt="" className="w-full max-w-2xs rounded-lg" />
      <h2 className="type-heading">{title}</h2>
      <p className="max-w-prose text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

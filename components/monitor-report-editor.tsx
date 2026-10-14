"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Pencil, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

export type MonitorReading = { name: string; ip: string; readings: string };

export function MonitorReportEditor({ reportId, initial }: { reportId: number; initial: MonitorReading[] }) {
  const router = useRouter();
  const [printers, setPrinters] = useState(initial);
  const [original, setOriginal] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const unavailable = useMemo(() => printers.filter((printer) => /^100(?:\.00)?\s*%$/.test(printer.readings.split("|")[1]?.trim() || "")).length, [printers]);
  const filtered = useMemo(() => printers.map((printer, index) => ({ printer, index })).filter(({ printer }) => `${printer.name} ${printer.ip} ${printer.readings}`.toLowerCase().includes(query.toLowerCase())), [printers, query]);
  const visible = showAll || query ? filtered : filtered.slice(0, 8);

  function edit(index: number, key: keyof MonitorReading, value: string) {
    setPrinters((current) => current.map((printer, i) => i === index ? { ...printer, [key]: value } : printer));
    setMessage("");
  }

  function cancel() {
    setPrinters(original);
    setEditing(false);
    setMessage("");
  }

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printers }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel salvar.");
      setOriginal(printers);
      setEditing(false);
      setMessage("Alteracoes salvas");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="monitor-editor">
    <div className="monitor-toolbar">
      <div className="monitor-search"><Search size={16} /><input aria-label="Buscar impressora" placeholder="Buscar por nome, IP ou leitura" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <div className="monitor-toolbar-actions">
        {editing ? <><button className="report-secondary-action" onClick={cancel} disabled={busy}><X size={15} /> Cancelar</button><button onClick={save} disabled={busy}><Check size={15} /> {busy ? "Salvando..." : "Salvar alteracoes"}</button></> : <button className="report-secondary-action" onClick={() => setEditing(true)}><Pencil size={15} /> Editar leituras</button>}
      </div>
    </div>
    {message && <p className="monitor-save-message" role="status">{message}</p>}
    <div className="monitor-list">
      {visible.map(({ printer, index }) => {
        const isUnavailable = /^100(?:\.00)?\s*%$/.test(printer.readings.split("|")[1]?.trim() || "");
        return <article className="monitor-printer" key={`${printer.ip}-${index}`}>
          <div className="monitor-printer-heading">
            <div className="monitor-printer-identity"><span className={`monitor-status-dot ${isUnavailable ? "is-down" : ""}`} /><div>
              {editing ? <input aria-label={`Nome da impressora ${index + 1}`} value={printer.name} onChange={(event) => edit(index, "name", event.target.value)} /> : <h3>{printer.name.replace(/^PRN\s*/, "")}</h3>}
              <span>{editing ? <input aria-label={`IP da impressora ${index + 1}`} value={printer.ip} onChange={(event) => edit(index, "ip", event.target.value)} /> : printer.ip}</span>
            </div></div>
            <span className={`monitor-status-pill ${isUnavailable ? "is-down" : ""}`}>{isUnavailable ? "Sem resposta" : "Monitorada"}</span>
          </div>
          <div className="monitor-reading-label">Leitura do equipamento</div>
          {editing ? <textarea aria-label={`Leituras da impressora ${index + 1}`} rows={2} value={printer.readings} onChange={(event) => edit(index, "readings", event.target.value)} /> : <p className="monitor-reading-text">{printer.readings}</p>}
        </article>;
      })}
      {!visible.length && <div className="report-empty">Nenhuma impressora corresponde a essa busca.</div>}
    </div>
    {!query && filtered.length > 8 && <button className="monitor-show-more" onClick={() => setShowAll((value) => !value)}>{showAll ? <>Mostrar menos <ChevronUp size={15} /></> : <>Ver todas as {filtered.length} impressoras <ChevronDown size={15} /></>}</button>}
    <div className="monitor-footnote"><span>{printers.length - unavailable} com resposta</span><span>{unavailable} sem resposta (perda de 100%)</span><span>Os contadores de páginas são acumulados.</span></div>
  </div>;
}

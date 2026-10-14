"use client";

import { useEffect, useMemo, useState } from "react";
import { FilePlus2, Save, X } from "lucide-react";
import type { Printer } from "@/app/lib/types";

type Draft = { month: string; impressions: Record<string, number> };
const draftKey = "sistema-relatorios:rascunho-mensal";

export function ReportForm({ printers }: { printers: Printer[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => new Date().toLocaleDateString("sv-SE").slice(0, 7));
  const [impressions, setImpressions] = useState<Record<string, number>>({});
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(draftKey);
      if (stored) {
        const draft = JSON.parse(stored) as Draft;
        if (draft.month) setMonth(draft.month);
        if (draft.impressions) setImpressions(draft.impressions);
      }
    } catch { /* rascunho ilegivel; inicia um novo */ }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, month, impressions]);

  useEffect(() => {
    if (!draftReady) return;
    localStorage.setItem(draftKey, JSON.stringify({ month, impressions }));
  }, [draftReady, month, impressions]);

  const total = useMemo(() => Object.values(impressions).reduce((sum, value) => sum + (Number(value) || 0), 0), [impressions]);
  function close() {
    localStorage.setItem(draftKey, JSON.stringify({ month, impressions }));
    setOpen(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, impressions }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel gerar o relatorio.");
      localStorage.removeItem(draftKey);
      window.location.href = "/api/reports/" + data.id + "/pdf";
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nao foi possivel gerar o relatorio.");
      setBusy(false);
    }
  }

  return <>
    <button className="report-primary-action" onClick={() => setOpen(true)}>
      <FilePlus2 size={17} /> Gerar relatorio mensal
    </button>
    {open && <div className="report-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="monthly-report-title">
        <div className="report-modal-header">
          <div><span className="report-overline">Novo lancamento</span><h2 id="monthly-report-title">Relatorio mensal</h2><p>Informe a quantidade impressa por equipamento.</p></div>
          <button className="report-icon-button" type="button" onClick={close} aria-label="Fechar e salvar rascunho"><X size={19} /></button>
        </div>
        {!printers.length ? <div className="report-empty">Cadastre uma impressora antes de lancar um relatorio.</div> : <form onSubmit={submit}>
          <label className="report-month-field">Mes de referencia<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} required /></label>
          <div className="report-form-list">
            {printers.map((printer) => <label className="report-form-printer" key={printer.id}>
              <span><strong>{printer.nome}</strong><small>{printer.setor} · {printer.patrimonio}</small></span>
              <span className="report-number-field"><input type="number" min="0" step="1" aria-label={`Impressoes de ${printer.nome}`} value={impressions[String(printer.id)] ?? 0} onChange={(event) => setImpressions((current) => ({ ...current, [String(printer.id)]: Number(event.target.value) }))} /><small>paginas</small></span>
            </label>)}
          </div>
          <div className="report-modal-footer">
            <span className="report-draft-note"><Save size={14} /> Rascunho salvo automaticamente · {total.toLocaleString("pt-BR")} paginas</span>
            <div><button className="report-secondary-action" type="button" onClick={close}>Fechar</button><button type="submit" disabled={busy}>{busy ? "Gerando..." : "Gerar PDF"}</button></div>
          </div>
          {error && <p className="report-error">{error}</p>}
        </form>}
      </section>
    </div>}
  </>;
}

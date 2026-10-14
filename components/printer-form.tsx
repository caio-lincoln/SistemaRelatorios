"use client";

import { useState } from "react";

export function PrinterForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/printers", { method: "POST", body: new FormData(event.currentTarget) });
    const data = await response.json();
    setMessage(data.error || "Impressora cadastrada.");
    setBusy(false);
    if (response.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit}>
    <div className="fields">
      <label>Patrimônio<input name="patrimonio" required /></label>
      <label>Nome<input name="nome" required /></label>
      <label>Setor<input name="setor" required /></label>
      <label>Localização<input name="localizacao" required /></label>
      <label>Modelo<input name="modelo" required /></label>
      <label>Número de série<input name="numero_serie" /></label>
      <label>IP<input name="ip" /></label>
    </div>
    <button disabled={busy}>{busy ? "Salvando..." : "Salvar impressora"}</button>
    {message && <span className="muted">{message}</span>}
  </form>;
}

export function DeactivateButton({ id }: { id: number }) {
  const [busy, setBusy] = useState(false);
  async function deactivate() {
    if (!window.confirm("Desativar esta impressora?")) return;
    setBusy(true);
    await fetch("/api/printers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    window.location.reload();
  }
  return <button className="button danger" onClick={deactivate} disabled={busy}>{busy ? "..." : "Desativar"}</button>;
}

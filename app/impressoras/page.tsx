import { query } from "@/app/lib/db";
import type { Printer } from "@/app/lib/types";
import { DeactivateButton, PrinterForm } from "@/components/printer-form";

export const dynamic = "force-dynamic";

export default async function PrintersPage() {
  const printers = await query<Printer>("SELECT * FROM impressoras WHERE ativa = 1 ORDER BY setor, nome");
  return <div>
    <header className="page-header"><div><p className="eyebrow">Cadastro</p><h1>Impressoras</h1><p className="subtitle">Cadastre e mantenha atualizados os equipamentos ativos.</p></div></header>
    <section className="panel"><h2>Nova impressora</h2><PrinterForm /></section>
    <section className="panel" style={{ marginTop: 18 }}><h2>Impressoras cadastradas ({printers.length})</h2>
      {!printers.length ? <div className="empty">Nenhuma impressora cadastrada.</div> : <div className="scroll"><table><thead><tr><th>Patrimonio</th><th>Nome</th><th>Setor</th><th>Local</th><th>Modelo</th><th>IP</th><th>Acoes</th></tr></thead><tbody>
        {printers.map((printer) => <tr key={printer.id}><td>{printer.patrimonio}</td><td>{printer.nome}</td><td>{printer.setor}</td><td>{printer.localizacao}</td><td>{printer.modelo}</td><td>{printer.ip}</td><td><DeactivateButton id={printer.id} /></td></tr>)}
      </tbody></table></div>}
    </section>
  </div>;
}

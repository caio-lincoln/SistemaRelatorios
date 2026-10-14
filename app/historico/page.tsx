import { query } from "@/app/lib/db";
import type { Report, ReportItem } from "@/app/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ mes?: string }>;

export default async function HistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const months = await query<{ mes_referencia: string }>("SELECT DISTINCT mes_referencia FROM relatorios ORDER BY mes_referencia DESC");
  const selected = params.mes || months[0]?.mes_referencia || "";
  const reports = selected ? await query<Report>("SELECT * FROM relatorios WHERE mes_referencia = ? ORDER BY gerado_em DESC", [selected]) : [];
  return <div>
    <header className="page-header"><div><p className="eyebrow">Consulta</p><h1>Historico</h1><p className="subtitle">Escolha um mes para revisar os dados registrados e baixar seus relatorios.</p></div></header>
    <section className="panel">
      <h2>Filtrar por mes</h2>
      {!months.length ? <div className="empty">Nenhum mes possui relatorio salvo ainda.</div> : <form method="get" className="fields">
        <label>Mes de referencia<select name="mes" defaultValue={selected}>{months.map((month) => <option key={month.mes_referencia}>{month.mes_referencia}</option>)}</select></label>
        <button type="submit">Consultar mes</button>
      </form>}
    </section>
    {reports.map((report) => <ReportDetail key={report.id} report={report} />)}
  </div>;
}

async function ReportDetail({ report }: { report: Report }) {
  const items = await query<ReportItem>("SELECT * FROM relatorio_itens WHERE relatorio_id = ? ORDER BY setor, nome", [report.id]);
  return <section className="panel" style={{ marginTop: 18 }}>
    <div className="section-heading"><div><h2>Relatorio de {report.mes_referencia}</h2><p className="muted">Gerado em {new Date(report.gerado_em).toLocaleString("pt-BR")} · Total: {Number(report.total_impressoes).toLocaleString("pt-BR")}</p></div><a className="button" href={"/api/reports/" + report.id + "/pdf"}>Baixar PDF</a></div>
    <div className="scroll"><table><thead><tr><th>Patrimonio</th><th>Nome</th><th>Setor</th><th>Local</th><th>Impressoes</th></tr></thead><tbody>
      {items.map((item) => <tr key={item.id}><td>{item.patrimonio}</td><td>{item.nome}</td><td>{item.setor}</td><td>{item.localizacao}</td><td>{Number(item.impressoes).toLocaleString("pt-BR")}</td></tr>)}
    </tbody></table></div>
  </section>;
}

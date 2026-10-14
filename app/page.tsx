import Link from "next/link";
import { ArrowRight, FileText, Printer, TrendingUp } from "lucide-react";
import { query } from "@/app/lib/db";
import type { Printer as PrinterType, Report } from "@/app/lib/types";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [printers, reports] = await Promise.all([
    query<PrinterType>("SELECT * FROM impressoras WHERE ativa = 1 ORDER BY setor, nome"),
    query<Report>("SELECT * FROM relatorios ORDER BY gerado_em DESC LIMIT 12"),
  ]);
  const total = reports.reduce((sum, report) => sum + Number(report.total_impressoes), 0);
  return <div>
    <header className="page-header"><div><p className="eyebrow">Visao geral</p><h1>Dashboard</h1><p className="subtitle">Acompanhe o parque de impressoras e os relatorios mensais.</p></div></header>
    <div className="summary">
      <div className="metric"><Printer size={19} color="var(--brand)" /><span className="metric-label">Impressoras ativas</span><strong>{printers.length}</strong></div>
      <div className="metric"><FileText size={19} color="var(--brand)" /><span className="metric-label">Relatorios salvos</span><strong>{reports.length}</strong></div>
      <div className="metric"><TrendingUp size={19} color="var(--brand)" /><span className="metric-label">Impressoes recentes</span><strong>{total.toLocaleString("pt-BR")}</strong></div>
    </div>
    <div className="grid-two">
      <Link className="quick-link panel" href="/impressoras">Gerenciar impressoras <ArrowRight size={18} /></Link>
      <Link className="quick-link panel" href="/relatorios">Gerar relatorio mensal <ArrowRight size={18} /></Link>
    </div>
    <section className="panel" style={{ marginTop: 18 }}><h2>Relatorios recentes</h2><ReportTable reports={reports} /></section>
  </div>;
}

function ReportTable({ reports }: { reports: Report[] }) {
  if (!reports.length) return <div className="empty">Nenhum relatorio gerado ainda.</div>;
  return <div className="scroll"><table><thead><tr><th>Mes</th><th>Gerado em</th><th>Total</th><th>PDF</th></tr></thead><tbody>
    {reports.map((report) => <tr key={report.id}><td>{report.mes_referencia}</td><td>{new Date(report.gerado_em).toLocaleString("pt-BR")}</td><td>{Number(report.total_impressoes).toLocaleString("pt-BR")}</td><td><a className="button secondary" href={"/api/reports/" + report.id + "/pdf"}>Baixar PDF</a></td></tr>)}
  </tbody></table></div>;
}

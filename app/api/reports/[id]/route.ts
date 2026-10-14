import { execute, query } from "@/app/lib/db";
import type { Report } from "@/app/lib/types";

type Reading = { name: string; ip: string; readings: string };

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Relatorio invalido." }, { status: 400 });
  const body = await request.json() as { printers?: Reading[] };
  if (!Array.isArray(body.printers) || body.printers.length > 200) return Response.json({ error: "Dados de impressoras invalidos." }, { status: 400 });
  const reports = await query<Report>("SELECT * FROM relatorios WHERE id = ?", [id]);
  if (!reports[0]?.dados_monitoramento) return Response.json({ error: "Relatorio de monitoramento nao encontrado." }, { status: 404 });
  const printers = body.printers.map((item) => ({
    name: String(item.name || "").slice(0, 180),
    ip: String(item.ip || "").slice(0, 50),
    readings: String(item.readings || "").slice(0, 500),
  }));
  const total = printers.reduce((sum, item) => {
    const last = item.readings.match(/([\d.]+) páginas?\s*$/i)?.[1] || "0";
    return sum + Number(last.replace(/\./g, ""));
  }, 0);
  await execute("UPDATE relatorios SET dados_monitoramento = ?, total_impressoes = ? WHERE id = ?", [JSON.stringify(printers), total, id]);
  return Response.json({ ok: true });
}

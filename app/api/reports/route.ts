import { execute, getDb, query } from "@/app/lib/db";
import type { Printer } from "@/app/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as { month?: string; impressions?: Record<string, number> };
  if (!body.month) return Response.json({ error: "Informe o mes de referencia." }, { status: 400 });
  const printers = await query<Printer>("SELECT * FROM impressoras WHERE ativa = 1 ORDER BY setor, nome");
  if (!printers.length) return Response.json({ error: "Cadastre uma impressora antes." }, { status: 400 });
  const items = printers.map((printer) => ({
    printer,
    impressions: Math.max(0, Math.floor(Number(body.impressions?.[String(printer.id)] || 0))),
  }));
  const total = items.reduce((sum, item) => sum + item.impressions, 0);
  const result = await execute(
    "INSERT INTO relatorios (mes_referencia, gerado_em, total_impressoes, caminho_pdf) VALUES (?, ?, ?, ?)",
    [body.month, new Date().toISOString(), total, ""],
  );
  const reportId = Number(result.lastInsertRowid);
  await getDb().batch(items.map(({ printer, impressions }) => ({
    sql: "INSERT INTO relatorio_itens (relatorio_id, impressora_id, patrimonio, nome, setor, localizacao, modelo, impressoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [reportId, printer.id, printer.patrimonio, printer.nome, printer.setor, printer.localizacao, printer.modelo, impressions],
  })));
  return Response.json({ id: reportId });
}

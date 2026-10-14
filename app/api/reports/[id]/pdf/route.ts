import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { query } from "@/app/lib/db";
import type { Report, ReportItem } from "@/app/lib/types";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!id) return new Response("Relatorio invalido", { status: 400 });
  const reports = await query<Report>("SELECT * FROM relatorios WHERE id = ?", [id]);
  if (!reports[0]) return new Response("Relatorio nao encontrado", { status: 404 });
  const report = reports[0];
  if (report.dados_monitoramento) {
    const readings = JSON.parse(report.dados_monitoramento) as { name: string; ip: string; readings: string }[];
    const monitorPdf = await PDFDocument.create();
    const normal = await monitorPdf.embedFont(StandardFonts.Helvetica);
    const strong = await monitorPdf.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = 595;
    const left = 46;
    const right = 549;
    const pageHeight = 842;
    const lineBreak = (value: string, maxWidth: number, size: number) => {
      const words = value.split(/\s+/);
      const lines: string[] = [];
      let line = "";
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (normal.widthOfTextAtSize(candidate, size) > maxWidth && line) { lines.push(line); line = word; }
        else line = candidate;
      }
      if (line) lines.push(line);
      return lines;
    };
    const getPageCount = (value: string) => {
      const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const match = normalized.match(/([\d.]+)\s*(?:paginas?|pages?)\s*$/i);
      if (!match) return null;
      const count = Number(match[1].replace(/\./g, ""));
      return Number.isFinite(count) ? count : null;
    };
    let monitorPage = monitorPdf.addPage([pageWidth, pageHeight]);
    let cursor = 0;
    const drawHeader = (pageNumber: number) => {
      monitorPage.drawText("Páginas por impressora", { x: left, y: 788, size: 19, font: strong, color: rgb(0.12, 0.22, 0.16) });
      monitorPage.drawText("Leitura em 07/10/2026 · contador acumulado na data da coleta", { x: left, y: 767, size: 9, font: normal, color: rgb(0.38, 0.43, 0.39) });
      monitorPage.drawLine({ start: { x: left, y: 749 }, end: { x: right, y: 749 }, thickness: 1, color: rgb(0.86, 0.89, 0.85) });
      monitorPage.drawRectangle({ x: left, y: 713, width: right - left, height: 25, color: rgb(0.92, 0.95, 0.91) });
      monitorPage.drawText("IMPRESSORA", { x: left + 12, y: 722, size: 8, font: strong, color: rgb(0.31, 0.39, 0.33) });
      const pagesHeader = "PÁGINAS";
      monitorPage.drawText(pagesHeader, { x: right - 12 - strong.widthOfTextAtSize(pagesHeader, 8), y: 722, size: 8, font: strong, color: rgb(0.31, 0.39, 0.33) });
      monitorPage.drawText(`Relatório de monitoramento · ${pageNumber}`, { x: left, y: 27, size: 8, font: normal, color: rgb(0.55, 0.59, 0.55) });
      cursor = 713;
    };
    const newPage = (pageNumber: number) => {
      monitorPage = monitorPdf.addPage([pageWidth, pageHeight]);
      drawHeader(pageNumber);
    };
    drawHeader(1);
    for (const item of readings) {
      const nameLines = lineBreak(item.name, 390, 9);
      const rowHeight = Math.max(28, nameLines.length * 11 + 10);
      if (cursor - rowHeight < 43) newPage(monitorPdf.getPageCount() + 1);
      const top = cursor;
      const bottom = cursor - rowHeight;
      nameLines.forEach((line, index) => monitorPage.drawText(line, { x: left + 12, y: top - 17 - index * 11, size: 9, font: normal, color: rgb(0.18, 0.23, 0.19) }));
      const count = getPageCount(item.readings);
      const countText = count === null ? "—" : count.toLocaleString("pt-BR");
      monitorPage.drawText(countText, { x: right - 12 - normal.widthOfTextAtSize(countText, 9), y: top - Math.round((rowHeight + 9) / 2), size: 9, font: normal, color: rgb(0.18, 0.23, 0.19) });
      monitorPage.drawLine({ start: { x: left, y: bottom }, end: { x: right, y: bottom }, thickness: 0.5, color: rgb(0.89, 0.91, 0.88) });
      cursor -= rowHeight;
    }
    const bytes = await monitorPdf.save();
    return new Response(bytes.buffer as ArrayBuffer, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="leituras-${report.mes_referencia}-${id}.pdf"` },
    });
  }
  const items = await query<ReportItem>("SELECT * FROM relatorio_itens WHERE relatorio_id = ? ORDER BY setor, nome", [id]);
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 790;
  page.drawText("Relatorio Mensal de Impressoes", { x: 42, y, size: 17, font: bold, color: rgb(0.04, 0.25, 0.24) });
  y -= 25;
  page.drawText("Mes: " + report.mes_referencia + "   |   Gerado em: " + new Date(report.gerado_em).toLocaleString("pt-BR"), { x: 42, y, size: 9, font: regular });
  y -= 30;
  page.drawText("Patrimonio", { x: 42, y, size: 9, font: bold });
  page.drawText("Impressora / setor", { x: 125, y, size: 9, font: bold });
  page.drawText("Impressoes", { x: 480, y, size: 9, font: bold });
  y -= 18;
  for (const item of items) {
    if (y < 55) { page = pdf.addPage([595, 842]); y = 790; }
    page.drawText(String(item.patrimonio).slice(0, 13), { x: 42, y, size: 8, font: regular });
    page.drawText((String(item.nome) + " / " + String(item.setor)).slice(0, 54), { x: 125, y, size: 8, font: regular });
    page.drawText(Number(item.impressoes).toLocaleString("pt-BR"), { x: 480, y, size: 8, font: regular });
    y -= 17;
  }
  page.drawText("Total: " + Number(report.total_impressoes).toLocaleString("pt-BR"), { x: 400, y: Math.max(y - 4, 40), size: 10, font: bold });
  const bytes = await pdf.save();
  return new Response(bytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="relatorio-' + report.mes_referencia + "-" + id + '.pdf"',
    },
  });
}

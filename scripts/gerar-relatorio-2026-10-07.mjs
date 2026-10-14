import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@libsql/client";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = "C:/Users/caio.lincoln/.codex/attachments/4ba8a9db-a941-4ce2-b60a-668a10865f2c/Pasted text.txt";
const out = path.join(root, "relatorios", "relatorio_impressoras_2026-10-07.pdf");
const text = fs.readFileSync(source, "utf8");
const chunks = text.split(/(?=PRN )/).filter((part) => part.startsWith("PRN "));
const rows = chunks.map((chunk) => {
  const cells = chunk.replace(/\r/g, "").split("\n").flatMap((line) => line.split("\t")).map((v) => v.trim()).filter(Boolean);
  const name = cells[0] || "";
  const ip = cells[1] || "-";
  const readings = cells.slice(2).join(" | ");
  const counter = Number((readings.match(/([\d.]+) páginas?\s*$/i)?.[1] || "0").replace(/\./g, ""));
  const down = /100(?:\.00)?\s*%/.test(readings);
  return { name, ip, readings, counter, down };
});
if (!rows.length) throw new Error("Nenhuma impressora foi encontrada no texto anexado.");

const pdf = await PDFDocument.create();
const regular = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const pageSize = [842, 595];
const margin = 36;
const totalPages = rows.reduce((sum, row) => sum + row.counter, 0);
const perPage = 24;
for (let start = 0; start < rows.length; start += perPage) {
  const page = pdf.addPage(pageSize);
  page.drawText("Relatorio de monitoramento de impressoras", { x: margin, y: 555, size: 17, font: bold, color: rgb(0.08, 0.17, 0.29) });
  page.drawText("Leitura em 07/10/2026 | Periodo solicitado: 01/09/2026 a 07/10/2026", { x: margin, y: 535, size: 9, font: regular });
  page.drawText("Os totais de paginas abaixo sao contadores acumulados na data da coleta; nao representam paginas impressas no periodo.", { x: margin, y: 520, size: 8, font: regular, color: rgb(0.35, 0.35, 0.35) });
  page.drawText(`Equipamentos: ${rows.length} | Com perda de 100%: ${rows.filter((r) => r.down).length} | Soma dos contadores: ${totalPages.toLocaleString("pt-BR")} paginas`, { x: margin, y: 505, size: 9, font: bold });
  const top = 482;
  page.drawRectangle({ x: margin, y: top - 14, width: 770, height: 19, color: rgb(0.9, 0.93, 0.96) });
  page.drawText("Impressora", { x: margin + 5, y: top - 9, size: 8, font: bold });
  page.drawText("IP", { x: 300, y: top - 9, size: 8, font: bold });
  page.drawText("Leituras fornecidas (ping, perda, niveis, uptime e total de paginas)", { x: 390, y: top - 9, size: 8, font: bold });
  let y = top - 29;
  for (const row of rows.slice(start, start + perPage)) {
    const name = row.name.replace(/^PRN\s*/, "");
    const nameLines = regular.encodeText(name).length > 240 ? [name.slice(0, 43), name.slice(43)] : [name];
    const readText = row.readings.replace(/páginas/gi, "paginas").replace(/dias/gi, "d").replace(/(.{1,75}(?:\s|$))/g, "$1\n").split("\n").filter(Boolean);
    const lines = Math.max(nameLines.length, readText.length, 1);
    page.drawText(nameLines[0] || "", { x: margin + 5, y, size: 7, font: regular, maxWidth: 250 });
    if (nameLines[1]) page.drawText(nameLines[1], { x: margin + 5, y: y - 9, size: 7, font: regular, maxWidth: 250 });
    page.drawText(row.ip, { x: 300, y, size: 7, font: regular });
    readText.forEach((line, i) => page.drawText(line.trim(), { x: 390, y: y - i * 9, size: 7, font: regular, maxWidth: 410 }));
    const height = Math.max(17, lines * 9 + 4);
    page.drawLine({ start: { x: margin, y: y - height + 5 }, end: { x: 806, y: y - height + 5 }, thickness: 0.35, color: rgb(0.85, 0.87, 0.89) });
    y -= height;
  }
  page.drawText(`Pagina ${Math.floor(start / perPage) + 1} | Total de equipamentos: ${rows.length}`, { x: margin, y: 20, size: 8, font: regular, color: rgb(0.4, 0.4, 0.4) });
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, await pdf.save());

const db = createClient({ url: `file:${path.join(root, "data", "sistema_relatorios.db").replaceAll("\\", "/")}` });
try {
  await db.execute("ALTER TABLE relatorios ADD COLUMN dados_monitoramento TEXT NOT NULL DEFAULT ''");
} catch (error) {
  if (!String(error).toLowerCase().includes("duplicate column")) throw error;
}
await db.batch([
  { sql: "DELETE FROM relatorio_itens WHERE relatorio_id IN (SELECT id FROM relatorios WHERE mes_referencia = ?)", args: ["2026-09"] },
  { sql: "DELETE FROM relatorios WHERE mes_referencia = ?", args: ["2026-09"] },
  { sql: "DELETE FROM relatorios WHERE mes_referencia = ? AND dados_monitoramento != ''", args: ["2026-10"] },
]);
await db.execute(
  "INSERT INTO relatorios (mes_referencia, gerado_em, total_impressoes, caminho_pdf, dados_monitoramento) VALUES (?, ?, ?, ?, ?)",
  ["2026-10", "2026-10-07T12:00:00-03:00", totalPages, out, JSON.stringify(rows.map(({ name, ip, readings }) => ({ name, ip, readings })))],
);
await db.close();
for (const name of fs.readdirSync(path.join(root, "relatorios"))) {
  if (/2026-09.*\.pdf$/i.test(name)) fs.rmSync(path.join(root, "relatorios", name));
}
console.log(JSON.stringify({ pdf: out, devices: rows.length, totalPageCounters: totalPages, unavailable: rows.filter((r) => r.down).length }));

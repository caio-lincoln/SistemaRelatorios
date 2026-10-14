import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@libsql/client";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = path.join(root, "data", "sistema_relatorios.db").replaceAll("\\", "/");
const output = path.join(root, "relatorios", "relatorio_impressoras_2026-10-07.pdf");
const db = createClient({ url: `file:${dbPath}` });
const result = await db.execute("SELECT dados_monitoramento FROM relatorios WHERE mes_referencia = ? AND dados_monitoramento != '' ORDER BY id DESC LIMIT 1", ["2026-10"]);
await db.close();
if (!result.rows.length) throw new Error("Relatorio de monitoramento de outubro nao encontrado no banco local.");
const printers = JSON.parse(String(result.rows[0].dados_monitoramento));

const pdf = await PDFDocument.create();
const regular = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const left = 46;
const right = 549;
const wrap = (value, maxWidth, size) => {
  const lines = [];
  let line = "";
  for (const word of value.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (regular.widthOfTextAtSize(next, size) > maxWidth && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
};
const pageNumberLabel = (number) => `Relatorio de monitoramento · ${number}`;
let page;
let cursor = 0;
let pageNumber = 0;
function addPage() {
  pageNumber += 1;
  page = pdf.addPage([595, 842]);
  page.drawText("Paginas por impressora", { x: left, y: 788, size: 19, font: bold, color: rgb(0.12, 0.22, 0.16) });
  page.drawText("Leitura em 07/10/2026 | Contador acumulado na data da coleta", { x: left, y: 767, size: 9, font: regular, color: rgb(0.38, 0.43, 0.39) });
  page.drawLine({ start: { x: left, y: 749 }, end: { x: right, y: 749 }, thickness: 1, color: rgb(0.86, 0.89, 0.85) });
  page.drawRectangle({ x: left, y: 713, width: right - left, height: 25, color: rgb(0.92, 0.95, 0.91) });
  page.drawText("IMPRESSORA", { x: left + 12, y: 722, size: 8, font: bold, color: rgb(0.31, 0.39, 0.33) });
  const heading = "PAGINAS";
  page.drawText(heading, { x: right - 12 - bold.widthOfTextAtSize(heading, 8), y: 722, size: 8, font: bold, color: rgb(0.31, 0.39, 0.33) });
  page.drawText(pageNumberLabel(pageNumber), { x: left, y: 27, size: 8, font: regular, color: rgb(0.55, 0.59, 0.55) });
  cursor = 713;
}
function pageCount(readings) {
  const plain = String(readings).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const match = plain.match(/([\d.]+)\s*(?:paginas?|pages?)\s*$/i);
  if (!match) return "—";
  const number = Number(match[1].replace(/\./g, ""));
  return Number.isFinite(number) ? number.toLocaleString("pt-BR") : "—";
}

addPage();
for (let index = 0; index < printers.length; index += 1) {
  const printer = printers[index];
  const lines = wrap(String(printer.name || "Impressora sem nome"), 390, 9);
  const height = Math.max(28, lines.length * 11 + 10);
  if (cursor - height < 43) addPage();
  const bottom = cursor - height;
  if (index % 2 === 0) page.drawRectangle({ x: left, y: bottom, width: right - left, height, color: rgb(0.985, 0.989, 0.98) });
  const count = pageCount(printer.readings);
  page.drawText(count, { x: right - 12 - regular.widthOfTextAtSize(count, 9), y: cursor - Math.round((height + 9) / 2), size: 9, font: regular, color: rgb(0.18, 0.23, 0.19) });
  lines.forEach((line, lineIndex) => page.drawText(line, { x: left + 12, y: cursor - 17 - lineIndex * 11, size: 9, font: regular, color: rgb(0.18, 0.23, 0.19) }));
  page.drawLine({ start: { x: left, y: bottom }, end: { x: right, y: bottom }, thickness: 0.5, color: rgb(0.89, 0.91, 0.88) });
  cursor = bottom;
}

fs.writeFileSync(output, await pdf.save());
console.log(JSON.stringify({ output, printers: printers.length, pages: pdf.getPageCount() }));

import { createClient } from "@libsql/client";

const source = createClient({ url: process.env.LOCAL_DATABASE_URL || "file:./data/sistema_relatorios.db" });
const target = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error("Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN antes da migracao.");
}

await target.batch([
  "CREATE TABLE IF NOT EXISTS impressoras (id INTEGER PRIMARY KEY AUTOINCREMENT, patrimonio TEXT NOT NULL, nome TEXT NOT NULL, setor TEXT NOT NULL, localizacao TEXT NOT NULL, modelo TEXT NOT NULL, numero_serie TEXT NOT NULL DEFAULT '-', ip TEXT NOT NULL DEFAULT '-', ativa INTEGER NOT NULL DEFAULT 1, criado_em TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS relatorios (id INTEGER PRIMARY KEY AUTOINCREMENT, mes_referencia TEXT NOT NULL, gerado_em TEXT NOT NULL, total_impressoes INTEGER NOT NULL, caminho_pdf TEXT NOT NULL DEFAULT '')",
  "CREATE TABLE IF NOT EXISTS relatorio_itens (id INTEGER PRIMARY KEY AUTOINCREMENT, relatorio_id INTEGER NOT NULL, impressora_id INTEGER NOT NULL, patrimonio TEXT NOT NULL, nome TEXT NOT NULL, setor TEXT NOT NULL, localizacao TEXT NOT NULL, modelo TEXT NOT NULL, impressoes INTEGER NOT NULL)",
]);

for (const table of ["impressoras", "relatorios", "relatorio_itens"]) {
  const rows = (await source.execute("SELECT * FROM " + table)).rows;
  if (!rows.length) continue;
  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => "?").join(", ");
  for (const row of rows) {
    await target.execute(
      "INSERT OR IGNORE INTO " + table + " (" + columns.join(", ") + ") VALUES (" + placeholders + ")",
      columns.map((column) => row[column]),
    );
  }
  console.log(table + ": " + rows.length + " registros processados");
}

console.log("Migracao concluida.");

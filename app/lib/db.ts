import { createClient, type Client, type InArgs } from "@libsql/client";

let client: Client | undefined;
let schemaReady: Promise<void> | undefined;

export function getDb() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL || "file:./data/sistema_relatorios.db";
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  return client;
}

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getDb()
      .batch([
        "CREATE TABLE IF NOT EXISTS impressoras (id INTEGER PRIMARY KEY AUTOINCREMENT, patrimonio TEXT NOT NULL, nome TEXT NOT NULL, setor TEXT NOT NULL, localizacao TEXT NOT NULL, modelo TEXT NOT NULL, numero_serie TEXT NOT NULL DEFAULT '-', ip TEXT NOT NULL DEFAULT '-', ativa INTEGER NOT NULL DEFAULT 1, criado_em TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS relatorios (id INTEGER PRIMARY KEY AUTOINCREMENT, mes_referencia TEXT NOT NULL, gerado_em TEXT NOT NULL, total_impressoes INTEGER NOT NULL, caminho_pdf TEXT NOT NULL DEFAULT '')",
        "CREATE TABLE IF NOT EXISTS relatorio_itens (id INTEGER PRIMARY KEY AUTOINCREMENT, relatorio_id INTEGER NOT NULL, impressora_id INTEGER NOT NULL, patrimonio TEXT NOT NULL, nome TEXT NOT NULL, setor TEXT NOT NULL, localizacao TEXT NOT NULL, modelo TEXT NOT NULL, impressoes INTEGER NOT NULL, FOREIGN KEY (relatorio_id) REFERENCES relatorios(id))",
      ])
      .then(async () => {
        try {
          await getDb().execute("ALTER TABLE relatorios ADD COLUMN dados_monitoramento TEXT NOT NULL DEFAULT ''");
        } catch (error) {
          if (!String(error).toLowerCase().includes("duplicate column")) throw error;
        }
      });
  }
  await schemaReady;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  args: InArgs = [],
) {
  await ensureSchema();
  const result = await getDb().execute({ sql, args });
  return result.rows.map((row) => ({ ...row })) as T[];
}

export async function execute(sql: string, args: InArgs = []) {
  await ensureSchema();
  return getDb().execute({ sql, args });
}

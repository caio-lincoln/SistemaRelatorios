import { execute } from "@/app/lib/db";

export async function POST(request: Request) {
  const form = await request.formData();
  const values = ["patrimonio", "nome", "setor", "localizacao", "modelo"].map((key) =>
    String(form.get(key) || "").trim(),
  );
  if (values.some((value) => !value)) {
    return Response.json({ error: "Preencha os campos obrigatorios." }, { status: 400 });
  }
  await execute(
    "INSERT INTO impressoras (patrimonio, nome, setor, localizacao, modelo, numero_serie, ip, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [...values, String(form.get("numero_serie") || "-"), String(form.get("ip") || "-"), new Date().toISOString()],
  );
  return Response.json({ ok: true });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { id?: number };
  if (!body.id) return Response.json({ error: "Impressora invalida." }, { status: 400 });
  await execute("UPDATE impressoras SET ativa = 0 WHERE id = ?", [body.id]);
  return Response.json({ ok: true });
}

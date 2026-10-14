# Sistema de Relatórios de Impressoras

Aplicação Next.js para cadastrar impressoras, registrar as impressões mensais, consultar o histórico e gerar PDFs. O projeto está preparado para hospedagem na Vercel e banco Turso/libSQL.

## Desenvolvimento local

~~~powershell
pnpm install
pnpm dev
~~~

Abra http://localhost:3000. Sem variáveis de ambiente, o desenvolvimento usa data/sistema_relatorios.db como fallback local.

## Turso

Crie um banco no Turso e configure as variáveis do arquivo .env.example em .env.local:

~~~text
TURSO_DATABASE_URL=libsql://seu-banco-seu-org.turso.io
TURSO_AUTH_TOKEN=seu-token
~~~

As tabelas são criadas automaticamente na primeira requisição. Em produção, configure as mesmas variáveis nas Environment Variables do projeto Vercel.

Para levar o banco local atual para o Turso, depois de configurar as variáveis, execute `pnpm migrate:local`. O script é Node.js e pode ser executado novamente sem duplicar os registros.

## Funcionalidades

- Dashboard com indicadores de impressoras, relatórios e impressões.
- Cadastro e desativação de impressoras.
- Lançamento mensal das impressões.
- Histórico com filtro por mês e detalhamento por impressora.
- Geração e download de PDF no runtime Node.js da Vercel.

## Deploy na Vercel

Importe o repositório na Vercel, mantenha o preset Next.js e cadastre TURSO_DATABASE_URL e TURSO_AUTH_TOKEN. O comando de build é next build e o comando local de produção é pnpm start.

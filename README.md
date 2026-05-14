# Altor — Sistema de Gestão

Sistema de controle físico-financeiro para incorporação imobiliária da Altor.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + RLS) · Vercel.

Migração em curso a partir do MVP em Apps Script + Google Sheets. Veja [`docs/MIGRATION_MAPPING.md`](docs/MIGRATION_MAPPING.md) e [`docs/SUPABASE_SCHEMA.sql`](docs/SUPABASE_SCHEMA.sql).

## Setup local

```bash
npm install
cp .env.example .env.local   # preencha as chaves
npm run dev
```

Variáveis em `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Estrutura

```
app/
├─ (app)/              # rotas autenticadas (sidebar shell)
│  ├─ layout.tsx
│  └─ dashboard/
├─ login/              # rota pública
└─ layout.tsx
lib/
├─ supabase/{client,server,service,middleware}.ts
└─ utils.ts
middleware.ts          # refresh de sessão + redirects
```

## Deploy

Auto-deploy via Vercel a cada push em `main`. Env vars configuradas no projeto Vercel.

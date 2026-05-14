# CLAUDE.md — Briefing do projeto Altor

> Este arquivo é o briefing inicial para o Claude Code quando ele abrir o projeto Next.js da Altor. Cole-o na raiz do repo. Aponta pra documentação completa em `MIGRATION_MAPPING.md` e `SUPABASE_SCHEMA.sql`.

## Contexto

Estamos **migrando** um MVP funcional (Apps Script + Google Sheets + HTML estático) para Next.js 14 + Supabase + TypeScript + Tailwind. O sistema é o **controle físico-financeiro de incorporação imobiliária da Altor** — usado pela diretoria, financeiro, obra e comercial.

**Antes de codificar qualquer coisa, leia:**

1. `docs/MIGRATION_MAPPING.md` — mapeamento completo do domínio, endpoints, regras de negócio e fases de migração.
2. `docs/SUPABASE_SCHEMA.sql` — DDL pronto pra rodar no Supabase.
3. (Opcional) Arquivos `02_AppsScript_*.gs` e `03_Frontend_index.html` do MVP, caso queira ver a implementação original de alguma regra.

## Stack

- **Framework:** Next.js 14 (App Router, Server Components por padrão)
- **Linguagem:** TypeScript estrito (`"strict": true`)
- **Estilo:** Tailwind CSS + tema dark dourado (paleta no `tailwind.config.ts`)
- **Banco:** Supabase Postgres (todas as 12 tabelas operacionais + `profiles` + `audit_log`)
- **Auth:** Supabase Auth (e-mail/senha) via `@supabase/ssr`
- **Forms:** zod + react-hook-form (preferência) + shadcn/ui se for instalado
- **Charts:** Recharts
- **PDF:** jsPDF + autotable no cliente (porte direto do MVP) — v2 pode migrar pra `@react-pdf/renderer`

## Convenções obrigatórias

### Estrutura de pastas
```
app/
├── (auth)/login/page.tsx
├── (app)/
│   ├── layout.tsx              # sidebar + topbar + auth guard
│   ├── dashboard/page.tsx
│   └── ...                     # ver MIGRATION_MAPPING §8
└── api/health/route.ts
components/
├── ui/                         # primitivos (Button, Input, Modal, DataTable)
├── data/                       # específicos do domínio (KPICard, OrcamentoCard, CronogramaRow)
└── forms/                      # EntityForm + FieldRenderer
lib/
├── supabase/
│   ├── client.ts               # createBrowserClient
│   ├── server.ts               # createServerClient (cookies)
│   └── service.ts              # service role — APENAS para admin operations
├── schemas/                    # zod schemas por entidade
├── actions/                    # server actions (mutations)
└── queries/                    # funções de leitura tipadas
types/
└── db.ts                       # types gerados pelo `supabase gen types typescript`
```

### Regras "duras" (nunca quebre)

1. **Nunca exponha o service role key no cliente.** Use apenas em `lib/supabase/service.ts` e só em server actions/rotas API. Pra qualquer query normal, use o cliente comum (RLS protege).
2. **Mutations sempre via server action** com `'use server'`. Nunca chame `supabase.from(...).insert/update/delete` do cliente diretamente.
3. **Reads em RSC** (Server Components) por padrão. Só vire client component se precisar de interatividade real (estado, eventos).
4. **Tipagem:** sempre rode `supabase gen types typescript --project-id <id> > types/db.ts` depois de alterar schema. Importe `Database` daí em todo client/server do Supabase.
5. **Sem `any`.** TS strict. Se precisar de escape, use `unknown` + narrowing.
6. **Datas:** datas puras (sem hora) viram `date` no Postgres, `string` (formato `YYYY-MM-DD`) no TS. Timestamps são `timestamptz`, `Date` no TS. Formatação pra usuário sempre via `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })`.
7. **Moeda:** sempre `numeric(14,2)` no banco, `number` no TS. Formatar com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
8. **Validação:** sempre zod, mesmo schema usado client (react-hook-form resolver) E server (parsing antes do insert). Centralizar em `lib/schemas/`.
9. **Side effects** (criar EAP ao criar Empreendimento, marcar vencedor → criar Compra, aprovar Medição → criar CP) **vão no banco** (triggers, RPCs). Não duplique a lógica no app.
10. **Auditoria** via trigger genérico ou middleware nas server actions. Toda mutação registra em `audit_log`.

### Padrão de server action

```ts
// lib/actions/empresas.ts
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { empresaSchema } from '@/lib/schemas/empresa';

export async function createEmpresa(formData: FormData) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  const parsed = empresaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.flatten() };

  const { data, error } = await supabase
    .from('empresas')
    .insert({ ...parsed.data, criado_por: user.id, atualizado_por: user.id })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath('/empresas');
  return { ok: true, data };
}
```

### Padrão de página RSC com query

```tsx
// app/(app)/empresas/page.tsx
import { createServerClient } from '@/lib/supabase/server';
import { DataTable } from '@/components/ui/data-table';
import { empresasColumns } from './columns';

export default async function EmpresasPage() {
  const supabase = createServerClient();
  const { data: empresas } = await supabase
    .from('empresas')
    .select('*')
    .eq('ativo', true)
    .order('razao_social');

  return <DataTable columns={empresasColumns} data={empresas ?? []} />;
}
```

### Padrão de delete com trava de vínculos

```ts
// lib/actions/<entidade>.ts
export async function deleteEmpresa(id: string) {
  const supabase = createServerClient();
  // 1. Chama RPC que valida vínculos
  const { data: bloqueios } = await supabase
    .rpc('verificar_vinculos', { p_entidade: 'empresas', p_id: id });
  if (bloqueios && bloqueios.length > 0) {
    return { ok: false, error: `Vinculado a: ${bloqueios.join('; ')}` };
  }
  // 2. RLS já garante que só ADMIN pode deletar
  const { error } = await supabase.from('empresas').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/empresas');
  return { ok: true };
}
```

## Paleta visual (tailwind.config.ts → theme.extend.colors)

```ts
colors: {
  bg:        { DEFAULT: '#0F172A', 2: '#1E293B', 3: '#334155' },
  primary:   { DEFAULT: '#C9A961', 2: '#A98F4E' },
  text:      { DEFAULT: '#F1F5F9', dim: '#94A3B8' },
  border:    '#334155',
  success:   '#10B981',
  warn:      '#F59E0B',
  danger:    '#EF4444',
  info:      '#3B82F6',
  gold:      '#FFD700'
}
```

Aplicar tema dark global no `html.dark` + Tailwind `dark:` variants.

## Fluxos críticos a preservar literalmente

Pra cada um, **o comportamento atual está documentado em `MIGRATION_MAPPING.md`**. Não tente "melhorar" sem perguntar:

- **Parcelamento** (CR/CP/Comissões): N parcelas (2–240), 7 periodicidades, ajuste de centavos na última, numeração 1/N…N/N.
- **Marcar Vencedor:** transação que muda status do vencedor + perdedores + cria registro em `compras`.
- **% Gasto colorido:** verde até 90%, amarelo 90–100%, vermelho >100% (estouro).
- **Auto-fill PAGO:** ao marcar CR/CP como PAGO via select inline, preencher `valor_pago = valor_original` e `data_pagamento = hoje`.
- **Sessão móvel:** Supabase Auth já faz isso via refresh tokens. Não reimplementar.

## Como rodar

```bash
pnpm install
# Configurar .env.local com NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
pnpm dev
```

Migrations:
```bash
# Rodar pela primeira vez
supabase db push   # ou cole SUPABASE_SCHEMA.sql no SQL Editor

# Gerar types
supabase gen types typescript --project-id <id> > types/db.ts
```

## Anti-patterns que NÃO queremos

- ❌ Service role exposto no cliente
- ❌ `useEffect(() => fetch(...))` pra carregar dados (use RSC)
- ❌ Lógica de negócio no front (regra é no banco/server action)
- ❌ Tipagem `any` ou `as any`
- ❌ Comentários óbvios (`// incrementa o contador`) ou disclaimers (`// Note: This is...`)
- ❌ Reimplementar autenticação custom (use Supabase Auth)
- ❌ Persistência em localStorage de dados sensíveis (token, etc.) — cookies HttpOnly via @supabase/ssr fazem isso por nós
- ❌ Geração de IDs no app (deixe o Postgres com `default uuid_generate_v4()`)

## Quando estiver em dúvida

1. Releia a seção relevante de `MIGRATION_MAPPING.md`.
2. Se a regra não estiver documentada, abra o arquivo `.gs` correspondente do MVP e leia a função original.
3. Se ainda assim houver ambiguidade, pergunte ao usuário antes de inventar comportamento.

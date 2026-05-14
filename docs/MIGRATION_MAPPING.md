# MIGRATION_MAPPING — MVP Apps Script → Next.js 14 + Supabase

> **Objetivo deste documento.** Mapear, de forma completa e literal, o sistema atual (MVP em Google Apps Script + Google Sheets + HTML estático) para guiar a reimplementação em Next.js 14 (App Router) + Supabase + TypeScript + Tailwind. Foi escrito para ser consumido por uma sessão do Claude Code: tudo que ele precisa saber sobre o domínio, regras de negócio, endpoints e validações está aqui.
>
> **Status atual do MVP:** v1.4 (com otimizações de performance — cache em DB.gs). Funcional, em uso, com hot path testado.
>
> **Arquivos-fonte do MVP (referência):**
> - `02_AppsScript_Code.gs` — roteamento, schemas, setup
> - `02_AppsScript_DB.gs` — CRUD genérico + cache + integridade referencial
> - `02_AppsScript_Modulos.gs` — lógicas de negócio (dashboard, cronograma, orçamentos, compras, medições, relatório)
> - `02_AppsScript_Auth.gs` — autenticação, hash, sessões
> - `03_Frontend_index.html` — frontend completo (SPA single-file, ~2440 linhas)
> - `01_Schema_GoogleSheets.md` — documentação das abas/colunas
> - `00_README_INSTALACAO.md` — guia funcional do produto

---

## 1. VISÃO GERAL DO PRODUTO

Sistema de **controle físico-financeiro para incorporação imobiliária**, multi-usuário, multi-obra. Usado pela diretoria, financeiro, engenharia e comercial da Altor. Cobre:

- Cadastro de **Empresas (fornecedores/empreiteiras)**, **Clientes** e **Empreendimentos**.
- **EAP padrão (14 etapas, M0→M7)** criada automaticamente ao cadastrar um Empreendimento, com pesos relativos para cálculo de % físico.
- **Financeiro:** Contas a Receber (CR), Contas a Pagar (CP), DDA (boletos eletrônicos), Comissões. Parcelamento automático (1/N…N/N) com 7 periodicidades.
- **Obra:** Cronograma físico-financeiro, Orçamentos & Cotações (cards comparativos por fornecedor, vencedor → gera Compra), Compras (status/prioridade), Medições de empreiteiros (orçado × medido × pago, com geração automática de CP).
- **Relatórios PDF** (semanal/quinzenal/mensal) gerados no frontend (jsPDF + autotable).
- **Dashboard** com KPIs financeiros, fluxo 6 meses, gasto por obra (pizza), categoria de despesas, avanço físico × financeiro.
- **Admin:** gestão de usuários (ADMIN/OPERACIONAL), logs de auditoria de todas operações sensíveis.

---

## 2. STACK ATUAL × ALVO

| Camada | MVP atual | Alvo |
|---|---|---|
| **Frontend** | HTML único + JS vanilla + Chart.js + jsPDF (CDN) | Next.js 14 App Router + React Server Components + Tailwind |
| **Backend / API** | Apps Script Web App (`doGet`/`doPost`, switch por `action`) | Route Handlers (`app/api/**/route.ts`) ou Server Actions |
| **Banco de dados** | Google Sheets (15 abas, leitura via `getDataRange().getValues()`) | Supabase Postgres |
| **Autenticação** | SHA-256 + salt + pepper + 10k stretching + tabela `Sessoes` com token | Supabase Auth (e-mail/senha) + RLS |
| **Concorrência** | `LockService.getScriptLock()` em writes | Transações Postgres (`BEGIN`/`COMMIT`) ou `select for update` quando necessário |
| **Logs/Auditoria** | Aba `Logs` (append) | Tabela `audit_log` + trigger ou middleware |
| **Cache** | `CacheService` + cache em memória (v1.4) | Built-in: Next cache (`unstable_cache`), Supabase RPC, ISR onde fizer sentido |
| **Charts** | Chart.js (CDN) | Recharts (já era opção sugerida) ou manter Chart.js como cliente |
| **PDF** | jsPDF + autotable no cliente | jsPDF cliente OU @react-pdf/renderer no servidor (preferível) |
| **Deploy** | Apps Script + Vercel (HTML) | Vercel (full stack) + Supabase |

---

## 3. DOMÍNIO — ENTIDADES E SCHEMA

> Notação: `id` (PK, UUID/text), datas como `timestamptz`/`date`, monetário como `numeric(14,2)`.

### 3.1 `usuarios`
**Origem:** aba `Usuarios`. **Alvo:** Supabase Auth (`auth.users`) + tabela `profiles` com metadados.

| Campo MVP | Tipo | Observação |
|---|---|---|
| id | text | substituir por UUID de `auth.users.id` |
| nome | text | →`profiles.nome` |
| email | text | →`auth.users.email` |
| senha_hash | text | **descartar** — usar Supabase Auth |
| perfil | enum('ADMIN','OPERACIONAL') | →`profiles.role` (criar enum no Postgres) |
| ativo | boolean | usar `auth.users.banned_until` ou flag em `profiles` |
| ultimo_login | timestamptz | já existe em `auth.users.last_sign_in_at` |

### 3.2 `empresas` (fornecedores, empreiteiras, projetistas)
| Campo | Tipo | |
|---|---|---|
| id | uuid PK | |
| razao_social | text NOT NULL | |
| nome_fantasia | text | |
| cnpj | text UNIQUE (NULL allowed) | validar formato |
| inscricao_estadual | text | |
| categoria | enum | EMPREITEIRA, FORNECEDOR_MATERIAL, SERVICO, PROJETISTA, IMOBILIARIA, INSTITUICAO_FINANCEIRA, OUTROS |
| email, telefone, contato_responsavel | text | |
| endereco, cidade, uf | text | |
| chave_pix, banco, agencia, conta | text | |
| observacoes | text | |
| ativo | boolean DEFAULT true | |
| timestamps | criado_em, atualizado_em, criado_por, atualizado_por | padrão |

### 3.3 `clientes` (compradores de unidades)
| Campo | Tipo | |
|---|---|---|
| id | uuid PK | |
| nome_completo | text NOT NULL | |
| tipo_pessoa | enum('PF','PJ') | |
| cpf_cnpj | text | |
| rg, data_nascimento, estado_civil, profissao | text/date | |
| email, telefone | text | |
| endereco, cidade, uf | text | |
| origem_lead | enum | INDICACAO, SITE, IMOBILIARIA, MARKETING, OUTROS |
| classificacao | enum | INVESTIDOR, PRIMEIRA_MORADIA, UPGRADE, OUTROS |
| observacoes | text | |
| ativo | boolean DEFAULT true | |
| timestamps | | |

### 3.4 `empreendimentos`
| Campo | Tipo | |
|---|---|---|
| id | uuid PK | |
| nome | text NOT NULL | |
| codigo_curto | text | sigla curta (ex.: SAV) |
| endereco, cidade, uf | text | |
| area_terreno, area_construida | numeric | m² |
| n_unidades | int | |
| vgv_estimado, custo_total_estimado | numeric(14,2) | |
| data_inicio_prevista, data_entrega_prevista, data_inicio_real, data_entrega_real | date | |
| status | enum | PLANEJAMENTO, EM_OBRA, ENTREGUE, PAUSADO, CANCELADO |
| percentual_fisico, percentual_financeiro | numeric | calculado (ver §6) — pode ficar como **VIEW** |
| observacoes | text | |
| timestamps | | |

**Side effect crítico:** ao criar um Empreendimento, sistema cria 14 linhas em `cronograma` (EAP padrão — ver §3.7).

### 3.5 `contas_receber`
| Campo | Tipo | |
|---|---|---|
| id | uuid PK | |
| empreendimento_id | uuid FK | |
| cliente_id | uuid FK | |
| descricao | text NOT NULL | |
| categoria | enum | VENDA_UNIDADE, INVESTIDOR, ALUGUEL, OUTROS |
| numero_parcela | text | ex.: "3/120" |
| valor_original, valor_pago, valor_aberto | numeric(14,2) | `valor_aberto = original − pago` — derivar via generated column |
| data_emissao, data_vencimento, data_pagamento | date | |
| forma_recebimento | enum | BOLETO, PIX, TRANSFERENCIA, FINANCIAMENTO_CAIXA, OUTROS |
| status | enum | ABERTO, PARCIAL, PAGO, ATRASADO, CANCELADO |
| juros_multa | numeric(14,2) | |
| observacoes | text | |
| timestamps | | |

### 3.6 `contas_pagar`
| Campo | Tipo | |
|---|---|---|
| id | uuid PK | |
| empreendimento_id | uuid FK (nullable — admin sem obra) | |
| empresa_id | uuid FK | |
| descricao | text NOT NULL | |
| categoria | enum | MATERIAL, MAO_DE_OBRA, EMPREITADA, PROJETO, LICENCAS_TAXAS, MARKETING, ADMINISTRATIVO, JURIDICO, IMPOSTO, OUTROS |
| etapa_eap | enum | M0_PRELIMINARES, M0_TERRAPLENAGEM, M1_FUNDACAO, M2_ESTRUTURA, M3_ALVENARIA, M3_INSTALACOES_HIDRAULICAS, M3_INSTALACOES_ELETRICAS, M4_REVESTIMENTO, M4_ESQUADRIAS, M4_PINTURA, M4_LOUCAS_METAIS, M5_AREA_COMUM, M6_HABITESE, M7_ENTREGA |
| numero_documento | text | NF, etc. |
| valor_original, valor_pago, valor_aberto | numeric(14,2) | idem CR |
| data_emissao, data_vencimento, data_pagamento | date | |
| forma_pagamento | enum | BOLETO, PIX, TRANSFERENCIA, CARTAO, DINHEIRO |
| status | enum | mesmo de CR |
| origem | enum | MANUAL, DDA, IMPORTACAO |
| linha_digitavel | text | |
| anexo_url | text | URL Drive/Storage |
| observacoes | text | |
| timestamps | | |

### 3.7 `cronograma` (EAP)
| Campo | Tipo | |
|---|---|---|
| id | uuid PK | |
| empreendimento_id | uuid FK NOT NULL | |
| etapa | text (referencia o enum de etapa_eap) | |
| marco | text | M0, M1… M7 |
| descricao | text | |
| ordem | int | 1..14 |
| data_inicio_prevista, data_fim_prevista, data_inicio_real, data_fim_real | date | |
| custo_orcado, custo_realizado | numeric(14,2) | `custo_realizado` é o legacy — usar `custo_pago` calculado a partir de CP |
| percentual_fisico | numeric | 0–100 |
| peso | numeric(5,4) | 0–1, soma das etapas = 1.00 |
| status | enum | NAO_INICIADA, EM_ANDAMENTO, CONCLUIDA, ATRASADA, PAUSADA |
| responsavel_id | uuid FK → `empresas` | empreiteira |
| observacoes | text | |
| timestamps | | |

**Constraint:** `UNIQUE(empreendimento_id, etapa)` — uma etapa por obra.

### 3.8 `orcamentos` (cotações)
| Campo | Tipo | |
|---|---|---|
| id | uuid PK | |
| empreendimento_id | uuid FK | |
| etapa | enum (mesmo de etapa_eap) NOT NULL | |
| grupo_cotacao | text NOT NULL | usado pra agrupar concorrentes |
| material_servico, descricao_detalhada | text | |
| unidade | enum | UN, KG, M2, M3, VB, MES, H |
| quantidade, valor_unitario, valor_total | numeric | `valor_total = qty × unit` — generated |
| empresa_id | uuid FK | fornecedor |
| prazo_entrega_dias | int | |
| condicao_pagamento | text | |
| data_cotacao, validade_proposta | date | |
| status | enum | PENDENTE, VENCEDOR, PERDEDOR, EM_ANALISE, CANCELADO |
| observacoes, anexo_url | text | |
| timestamps | | |

**Regra de agrupamento (auto):** normaliza por `(empreendimento_id, etapa, lower(trim(material_servico)))`. O campo `grupo_cotacao` é cosmético — duas cotações do mesmo material com nomes ligeiramente diferentes ainda agrupam.

### 3.9 `comissoes`
| Campo | Tipo | |
|---|---|---|
| id | uuid PK | |
| empreendimento_id, cliente_id | uuid FK | |
| beneficiario_tipo | enum | CORRETOR_AUTONOMO, IMOBILIARIA, FUNCIONARIO_INTERNO, INDICADOR |
| beneficiario_id | uuid FK → `empresas` (nullable, se PJ) | |
| beneficiario_nome | text NOT NULL | |
| valor_venda | numeric NOT NULL | VGV |
| percentual | numeric | % |
| valor_comissao_total | numeric | `= valor_venda × percentual / 100` — generated |
| parcela | text | ex.: "1/2" |
| valor_parcela | numeric NOT NULL | valor desta parcela |
| evento_gatilho | enum | ASSINATURA, HABITE_SE, ENTREGA_CHAVES, PERSONALIZADO |
| data_prevista, data_paga | date | |
| status | enum | A_PAGAR, PAGA, RETIDA, CANCELADA, PREVISTA |
| conta_pagar_id | uuid FK | nullable, preenchido quando se gera CP |
| observacoes | text | |
| timestamps | | |

### 3.10 `contratos`
| Campo | Tipo | |
|---|---|---|
| id | uuid PK | |
| numero | text NOT NULL | |
| tipo | enum | COMPRA_VENDA, EMPREITADA, FORNECIMENTO, PRESTACAO_SERVICO, INVESTIMENTO, LOCACAO, OUTROS |
| empreendimento_id | uuid FK | |
| parte_tipo | enum | CLIENTE, EMPRESA |
| parte_id | uuid FK | (cliente OU empresa, polimórfico — considerar 2 colunas FK nullable) |
| parte_nome | text NOT NULL | snapshot textual |
| objeto | text | |
| valor_total | numeric | |
| forma_pagamento | text | |
| data_assinatura, data_vigencia_inicio, data_vigencia_fim | date | |
| status | enum | EM_ELABORACAO, ATIVO, DISTRATADO, ENCERRADO, INADIMPLENTE |
| arquivo_url | text | |
| observacoes | text | |
| timestamps | | |

### 3.11 `dda` (boletos eletrônicos — hoje manual, futuro via API bancária)
| Campo | Tipo | |
|---|---|---|
| id | uuid PK | |
| banco_origem | enum | ITAU, BRADESCO, BB, SICREDI, SANTANDER, OUTROS |
| data_disponibilizacao | date | |
| beneficiario_nome, beneficiario_cnpj | text | |
| nosso_numero | text | |
| linha_digitavel, codigo_barras | text | |
| valor | numeric | |
| data_vencimento, data_emissao | date | |
| status | enum | RECEBIDO, VINCULADO_CP, PAGO, IGNORADO, CANCELADO |
| conta_pagar_id | uuid FK | nullable, quando vinculado |
| importado_em | timestamptz | |
| observacoes | text | |

### 3.12 `compras` (gerada do orçamento vencedor)
| Campo | Tipo | |
|---|---|---|
| id | uuid PK | |
| empreendimento_id | uuid FK | |
| etapa | enum (etapa_eap) | |
| material_servico, descricao_detalhada | text | |
| unidade, quantidade | | |
| empresa_id | uuid FK | |
| empresa_nome | text | snapshot |
| valor_total | numeric | |
| condicao_pagamento | text | |
| prazo_entrega_dias | int | |
| prioridade | enum | URGENTE, MODERADA, NORMAL — DEFAULT NORMAL |
| status | enum | ABERTO, EM_NEGOCIACAO, COMPRADO, RECEBIDO, CANCELADO — DEFAULT ABERTO |
| data_aprovacao, data_compra, data_recebimento | date | |
| numero_pedido | text | |
| orcamento_id | uuid FK → `orcamentos` | rastreia origem |
| observacoes | text | |
| timestamps | | |

### 3.13 `medicoes` (empreitada × medições parciais)
| Campo | Tipo | |
|---|---|---|
| id | uuid PK | |
| empreendimento_id | uuid FK | |
| empresa_id | uuid FK | empreiteira |
| etapa | enum (etapa_eap) | nullable |
| descricao | text NOT NULL | "Empreitada Estrutura Bloco A" |
| valor_orcado | numeric NOT NULL | total da empreitada inteira (mesmo valor em todas linhas do grupo) |
| numero_medicao | text | ex.: "1/5" |
| valor_medicao | numeric NOT NULL | valor desta medição parcial |
| percentual_medicao | numeric | 0–100 |
| data_medicao, data_pagamento | date | |
| status | enum | PREVISTA, MEDIDA, APROVADA, PAGA, CANCELADA |
| conta_pagar_id | uuid FK | nullable, preenchido após aprovar |
| observacoes | text | |
| timestamps | | |

**Agrupamento (no resumo):** `(empresa_id, empreendimento_id, descricao)` define "um contrato de empreitada". O `valor_orcado` é repetido em cada linha (a função `Mod_medicoesResumo` pega o maior — considerar normalizar futuramente em tabela `empreitadas`).

### 3.14 `audit_log`
| Campo | Tipo |
|---|---|
| id | uuid PK |
| timestamp | timestamptz DEFAULT now() |
| usuario_id | uuid FK → auth.users |
| usuario_email | text |
| acao | text | CREATE, UPDATE, DELETE, LOGIN, LOGIN_FALHO, UPDATE_STATUS, CREATE_PARCELADO |
| entidade | text | nome da tabela |
| entidade_id | uuid | |
| dados_antes, dados_depois | jsonb | |
| ip | inet | |

Implementar via **trigger genérico em Postgres** que ouve INSERT/UPDATE/DELETE nas tabelas relevantes, ou via middleware no API route. Trigger é mais robusto.

### 3.15 `sessoes`
**Não migrar.** Supabase Auth gerencia tokens (JWT/refresh) automaticamente. Eliminar a aba.

---

## 4. AUTENTICAÇÃO

### 4.1 Como está
- Custom SHA-256 + salt fixo + pepper (em `PropertiesService`) + **10.000 iterações** de stretching.
- Tabela `Sessoes` com token aleatório; expira 12h, com **janela móvel** (toda chamada autenticada renova).
- Política: senha mín. **8 caracteres com letras E números**.
- Anti-bruteforce: **5 falhas em 15min** → bloqueio temporário (verifica logs `LOGIN_FALHO`).
- Fallback de hash legacy: aceita hash antigo (sem pepper/stretching) e migra silenciosamente no primeiro login.
- Perfis: `ADMIN` (criar/editar/deletar usuários, ver logs, deletar registros) e `OPERACIONAL` (CRUD normal sem delete).

### 4.2 Como deve ficar (Supabase Auth)
- E-mail + senha via `supabase.auth.signInWithPassword`. Supabase já faz bcrypt internamente. Não reimplementar hash.
- **Tabela `profiles`** vinculada a `auth.users` por `id`:
  ```sql
  create table profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    nome text not null,
    role text not null default 'OPERACIONAL' check (role in ('ADMIN','OPERACIONAL')),
    ativo boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  ```
- **Trigger** que cria `profiles` automaticamente quando um `auth.users` é inserido.
- **Bloqueio temporário**: Supabase Auth já tem rate limiting nativo (configurável). Pode-se complementar com policy/middleware se necessário, mas em geral o default basta.
- **Política de senha**: configurável no painel Supabase ou via metadata.
- **Sessões**: cookies HttpOnly gerenciados pelo `@supabase/ssr` na Next.js. Janela móvel = refresh token automático.
- **Migração de usuários atuais**: como o hash atual é proprietário (SHA-256 customizado), **não é possível migrar senhas direto**. Estratégias:
  1. **Magic link de redefinição**: na 1ª autenticação, mandar e-mail de recuperação a todos.
  2. **Pre-cadastrar via admin API** com senhas temporárias e forçar troca no 1º login.

### 4.3 Authorization (RLS)
Substitui o check manual `if (usuario.perfil !== 'ADMIN')`. Exemplos:
```sql
-- Apenas autenticados leem qualquer coisa
create policy "auth read" on empresas for select using (auth.role() = 'authenticated');

-- Apenas ADMIN deleta
create policy "admin delete" on empresas for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
);
```
Detalhar policies por tabela na fase de implementação.

---

## 5. MAPEAMENTO DE ENDPOINTS

> Tabela completa de `action=...` → rota Next.js. Convenção sugerida: **Server Actions** para mutações dentro do app + **Route Handlers** em `app/api/**/route.ts` quando precisar de chamadas externas. Para a maioria dos casos, Server Actions + `revalidatePath` são mais ergonômicos.

### 5.1 Autenticação
| Action atual | Método | Rota alvo | Implementação |
|---|---|---|---|
| `login` | POST | `app/(auth)/login/page.tsx` (form) → server action | `supabase.auth.signInWithPassword` |
| `logout` | POST | server action | `supabase.auth.signOut()` |
| `me` | GET | hook `useUser` (lado cliente) ou helper `getUser()` server | `supabase.auth.getUser()` |
| `change_password` | POST | server action `changePassword(senhaNova)` | `supabase.auth.updateUser({ password })` (senha atual já validada pelo refresh) |
| `usuarios_listar` | GET | `app/admin/usuarios/page.tsx` | `select * from profiles join auth.users` (via service role no server) |
| `usuario_criar` | POST | server action `createUser` | `supabase.auth.admin.createUser` (service role) |
| `usuario_atualizar` | POST | server action `updateUser` | idem + update em `profiles` |

### 5.2 CRUD genérico
| Action | Método | Rota alvo | Notas |
|---|---|---|---|
| `list` (qualquer entidade) | GET | `app/<entidade>/page.tsx` (RSC com query direto) ou `app/api/<entidade>/route.ts` | usar `supabase.from(tabela).select('*')` + filtros |
| `get` | GET | `app/<entidade>/[id]/page.tsx` | `.single()` |
| `create` | POST | server action | inclui side effects (ver §6) |
| `update` | POST | server action | idem |
| `delete` | POST | server action | ADMIN only, valida vínculos (§7) |

### 5.3 Módulos específicos
| Action | Rota alvo | Implementação |
|---|---|---|
| `dashboard` | `app/dashboard/page.tsx` (RSC) | Query Postgres com agregações (CTE) — substitui o cálculo em JS. Pode virar uma function `dashboard(empreendimento_id uuid) returns json`. |
| `cronograma_obra` | `app/cronograma/[empreendimentoId]/page.tsx` | view ou function que retorna etapas + comprometido + pago |
| `cronograma_orcamento` | `app/orcamento-etapas/[empreendimentoId]/page.tsx` | similar — function que faz os joins |
| `cronograma_atualizar_orcamento` | server action | `update cronograma set custo_orcado = ...` |
| `orcamento_grupos` | `app/orcamentos/page.tsx` | query agrupando por (empreendimento_id, etapa, lower(material_servico)) |
| `orcamento_marcar_vencedor` | server action | transação: marca este como VENCEDOR, demais do grupo como PERDEDOR, cria registro em `compras` se não existir |
| `agenda_proximos` | `app/agenda/page.tsx` | query CR ∪ CP com filtro de data |
| `atualizar_status_rapido` | server action | update inline; se status='PAGO' em CR/CP, preenche valor_pago=valor_original e data_pagamento=hoje |
| `parcelar_cr` / `parcelar_cp` / `parcelar_comissao` | server actions | gera N rows; ajuste de centavos na última parcela; periodicidades MENSAL/SEMANAL/QUINZENAL/BIMESTRAL/TRIMESTRAL/SEMESTRAL/ANUAL |
| `comissao_gerar_cp` | server action | cria CP a partir da comissão, atualiza `comissoes.conta_pagar_id` |
| `compras_listar` | `app/compras/page.tsx` | ordenado por (prioridade DESC, data_aprovacao DESC) |
| `compras_atualizar_status` | server action | se status='COMPRADO' e dataCompra vazio, preenche hoje; se 'RECEBIDO', preenche data_recebimento |
| `compras_atualizar_prioridade` | server action | |
| `medicoes_resumo` | `app/medicoes/page.tsx` | view ou function que agrupa por (empresa_id, empreendimento_id, descricao) |
| `medicao_aprovar_gerar_cp` | server action | cria CP, atualiza `medicoes.conta_pagar_id` e `status='APROVADA'` |
| `relatorio_dados` | `app/relatorios/page.tsx` + server action `getRelatorio(tipo, empreendimento_id)` | retorna mesma estrutura JSON; PDF gerado no cliente OU via `@react-pdf/renderer` no server |
| `logs` | `app/admin/logs/page.tsx` | `select * from audit_log order by timestamp desc limit 200` |
| `ping` | `app/api/health/route.ts` | health check |
| `setup_check` | descartar | Supabase já tem migrations |

---

## 6. CAMPOS CALCULADOS E REGRAS DE NEGÓCIO

### 6.1 Campos derivados (preferir **generated columns** ou **views**)
| Tabela | Campo | Fórmula |
|---|---|---|
| contas_receber | valor_aberto | `valor_original - valor_pago` |
| contas_receber | status (default) | `pago<=0 → ABERTO; pago>=original → PAGO; senão PARCIAL` |
| contas_pagar | valor_aberto / status | idem |
| orcamentos | valor_total | `quantidade × valor_unitario` |
| comissoes | valor_comissao_total | `valor_venda × percentual / 100` |
| cronograma | custo_pago (calculado) | `sum(contas_pagar.valor_pago where etapa_eap=etapa AND empreendimento_id=...)` |
| cronograma | custo_comprometido | `sum(orcamentos.valor_total where status='VENCEDOR' AND etapa=... AND empreendimento_id=...)` |
| cronograma | percentual_gasto | `(custo_pago / coalesce(nullif(custo_orcado,0), custo_comprometido)) × 100` |
| empreendimentos | percentual_fisico | `sum(peso × percentual_fisico) / sum(peso)` (das etapas) |

> Recomendação: criar **views** `v_cronograma_obra`, `v_dashboard`, `v_medicoes_resumo` para encapsular essas agregações. Mais fácil de manter que recalcular no app.

### 6.2 Side effects automáticos

**A) Criar Empreendimento → criar 14 linhas em `cronograma` (EAP padrão).**
Implementar como **trigger after insert** na tabela `empreendimentos`:
```sql
create or replace function fn_criar_eap_padrao() returns trigger as $$
begin
  insert into cronograma (empreendimento_id, etapa, marco, descricao, ordem, peso, status)
  select new.id, etapa, marco, descricao, ordem, peso, 'NAO_INICIADA'
  from (values
    ('M0_PRELIMINARES', 'M0', 'Serviços preliminares e canteiro', 1, 0.03),
    ('M0_TERRAPLENAGEM', 'M0', 'Movimento de terra e contenções', 2, 0.04),
    ('M1_FUNDACAO', 'M1', 'Estacas, blocos, baldrames', 3, 0.10),
    -- ... (14 etapas total, conforme EAP_PADRAO em Code.gs)
  ) as eap(etapa, marco, descricao, ordem, peso);
  return new;
end $$ language plpgsql;

create trigger trg_criar_eap_padrao after insert on empreendimentos
  for each row execute function fn_criar_eap_padrao();
```
A lista completa das 14 etapas está em `02_AppsScript_Code.gs` (constante `EAP_PADRAO`).

**B) Marcar Orçamento como VENCEDOR → marcar concorrentes como PERDEDOR + criar `compras` (se não existe).**
Server action atômica:
```ts
await supabase.rpc('marcar_vencedor_orcamento', { orc_id: id });
```
Função plpgsql que faz tudo em transação:
1. `update orcamentos set status='PERDEDOR' where grupo_cotacao=:grupo and id<>:id`
2. `update orcamentos set status='VENCEDOR' where id=:id`
3. `insert into compras (...) select ... from orcamentos where id=:id and not exists (select 1 from compras where orcamento_id=:id)`

**C) Marcar CR/CP como PAGO via "Atualizar status rápido".**
Auto-preenche `valor_pago = valor_original`, `valor_aberto = 0`, `data_pagamento = hoje`.

**D) Aprovar Medição → criar CP e vincular.**
```
1. insert into contas_pagar (... categoria='EMPREITADA', valor=m.valor_medicao ...) returning id
2. update medicoes set status='APROVADA', conta_pagar_id=:cp_id where id=:m_id
```

**E) Gerar CP de Comissão.**
```
1. insert into contas_pagar (... categoria='OUTROS', descricao='Comissão …', valor=c.valor_parcela ...) returning id
2. update comissoes set conta_pagar_id=:cp_id where id=:c_id
```

**F) Marcar Compra como COMPRADO/RECEBIDO.**
Preenche `data_compra` ou `data_recebimento` se vazios.

### 6.3 Parcelamento
Para CR, CP e Comissões:
- Recebe `numero_parcelas` (2–240), `periodicidade`, `primeira_data`.
- Divide valor: `floor(total / n × 100) / 100` para cada uma; última recebe o ajuste de centavos.
- Numeração: `1/N`, `2/N`, …
- Datas: incremento por periodicidade (`MENSAL` = +1 mês, `SEMANAL` = +7 dias, etc.).
- Implementar como server action que faz N inserts em transação.

### 6.4 Cálculo do % físico do empreendimento
Média ponderada pelos pesos das etapas:
```
percentual_fisico_obra = sum(etapa.peso × etapa.percentual_fisico) / sum(etapa.peso)
```
A soma dos pesos default é 1.00, mas o usuário pode alterar. Usar a soma efetiva (não 1) como denominador para ficar correto em qualquer caso.

---

## 7. VALIDAÇÕES E INTEGRIDADE REFERENCIAL

### 7.1 Trava de exclusão (DELETE)
Antes de excluir, verificar se há vínculos. **Solução em Postgres:** usar FKs com `ON DELETE RESTRICT` (default) e tratar o erro `23503` (foreign_key_violation) no app, retornando uma mensagem amigável que conta os vínculos.

Casos a tratar (replica `_verificarVinculos` em `DB.gs`):
- **Empreendimento:** bloqueia se há orçamentos, CP, CR, comissões, contratos, compras, medições, OU cronograma com dados (orçado>0 ou %físico>0 ou datas reais preenchidas).
- **Empresa:** bloqueia se for fornecedor/empreiteira em CP, orçamentos, cronograma (responsavel_id), compras, medições, comissões (beneficiario_id), contratos (parte_id).
- **Cliente:** bloqueia se tem CR, comissões, contratos.
- **Orçamento VENCEDOR:** só permite excluir se a Compra gerada já foi removida.

**Implementação sugerida:** uma function plpgsql `verificar_vinculos(entidade text, id uuid) returns text[]` que retorna a lista de bloqueios. Chamar antes do delete na server action; se não-vazio, retornar erro com a mensagem.

### 7.2 Validações de input
- E-mail: regex `^[^@\s]+@[^@\s]+\.[^@\s]+$`.
- CNPJ/CPF: idealmente validar dígito verificador. MVP só guarda como string.
- Soma dos pesos do cronograma: sistema permite ≠ 1, mas o cálculo de % físico usa o total real (ver §6.4).
- `valor_original > 0` em CR/CP.

### 7.3 Concorrência
Substituir `LockService.waitLock(15000)` por transações Postgres. Para operações multi-row críticas (marcar vencedor, parcelar), usar `BEGIN; ... COMMIT;` ou RPC plpgsql que já é atômica. Postgres tem isolamento `READ COMMITTED` por default — suficiente para esse domínio.

---

## 8. FRONTEND — MAPEAMENTO DE ROTAS

App Router (`app/`). Organização sugerida:

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── layout.tsx                 # layout sem sidebar
├── (app)/
│   ├── layout.tsx                 # sidebar + topbar + auth guard
│   ├── dashboard/page.tsx
│   ├── agenda/page.tsx
│   ├── contas-receber/
│   │   ├── page.tsx               # lista
│   │   ├── [id]/page.tsx          # detalhe/edição (modal ou full page)
│   │   └── novo/page.tsx
│   ├── contas-pagar/...
│   ├── dda/...
│   ├── empreendimentos/...
│   ├── cronograma/[empreendimentoId]/page.tsx
│   ├── orcamento-etapas/page.tsx  # com seletor de obra
│   ├── orcamentos/page.tsx
│   ├── alocacao-orcamentos/page.tsx
│   ├── compras/page.tsx
│   ├── medicoes/page.tsx
│   ├── relatorios/page.tsx
│   ├── empresas/...
│   ├── clientes/...
│   ├── comissoes/...
│   ├── contratos/...
│   ├── status-contratos/page.tsx
│   └── admin/
│       ├── usuarios/page.tsx
│       └── logs/page.tsx
└── api/
    └── health/route.ts
```

### Componentes reutilizáveis a criar
- `<DataTable>` — substitui a `renderListaGenerica` (com busca, filtros, ordenação client-side ou via search params)
- `<Modal>` — substitui o `abrirModal` global
- `<FormField>` — input genérico baseado em schema (tipo, label, opcoes)
- `<EntityForm schema={...}>` — gera o formulário inteiro a partir de um schema TS (substitui `SCHEMAS_FORM`)
- `<KPICard>`, `<Badge>`, `<Toast>`
- `<InlineSelect>` — para edições rápidas (status, prioridade, obra)
- `<Sidebar>` com mesmo layout (Visão Geral / Financeiro / Obra / Relatórios / Cadastros / Comercial / Admin)
- `<ParcelaForm>` — caixa de "Gerar em parcelas"
- `<OrcamentoCard>` (card colorido verde/vermelho/amarelo/dourado)
- `<CronogramaRow>` (linha da EAP com drill-down)

### Schemas TypeScript dos formulários
A constante `SCHEMAS_FORM` em `03_Frontend_index.html` (linha ~2245) define formulários declarativos para 12 entidades. Migrar para arquivos `lib/schemas/<entidade>.ts` exportando objetos TS tipados (ou usar **zod** + **react-hook-form** + **shadcn/ui Form** para o gold-standard).

### Visual / design tokens
Tema dark com paleta dourada. Variáveis CSS atuais (manter):
```
--bg: #0F172A         /* slate-900 */
--bg-2: #1E293B       /* slate-800 */
--bg-3: #334155       /* slate-700 */
--primary: #C9A961    /* dourado Altor */
--primary-2: #A98F4E
--text: #F1F5F9
--text-dim: #94A3B8
--border: #334155
--success: #10B981
--warn: #F59E0B
--danger: #EF4444
--info: #3B82F6
--gold: #FFD700
```
No Tailwind, expor via `tailwind.config.ts → theme.extend.colors`. Mapear classes utilitárias atuais (.kpi, .badge, .grupo-cotacao, etc.) para componentes ou classes Tailwind.

### Charts
- **Dashboard:** fluxo 6 meses (bar+line combo), gasto por obra (pie), categoria CP (doughnut), avanço físico/financeiro (bar grouped).
- **Orçamentos:** comparativo por fornecedor (bar grouped), total comprometido por etapa (bar), spread por grupo (bar grouped).
- **Cronograma:** progress bars (componente próprio em Tailwind, não precisa lib).
- Sugestão: usar **Recharts** (React-native) para os charts, fácil de tipar.

### Geração de PDF
Função `gerarRelatorioPDF()` (jsPDF + autotable, ~100 linhas em `03_Frontend_index.html`). Duas opções:
- **Manter no cliente** (importar `jspdf` + `jspdf-autotable` via `dynamic(... { ssr: false })`).
- **Mover para o servidor** com `@react-pdf/renderer` — gera PDFs vetoriais via JSX, retorna stream. Mais profissional.
Recomendado para v1: manter no cliente (mesmo código, só convertendo pra TS). Para v2: migrar pro server.

---

## 9. FASES SUGERIDAS DE MIGRAÇÃO

### Fase 0 — Setup (1 dia)
1. Provisionar projeto Supabase.
2. Criar `tailwind.config.ts` com paleta Altor.
3. Configurar `@supabase/ssr` no Next (middleware + cookies).
4. Definir estrutura de pastas (acima).
5. Setup ESLint + Prettier + TypeScript strict.

### Fase 1 — Schema + Auth (2–3 dias)
1. Rodar todas as migrations SQL (ver `SUPABASE_SCHEMA.sql`).
2. Setup `profiles` + trigger automático.
3. RLS básico: "autenticado pode ler tudo, escrever conforme role".
4. Página `/login` + server action de login.
5. Layout `(app)` com sidebar (mock data por enquanto).
6. Página de Trocar Senha.

### Fase 2 — Cadastros (3–4 dias)
1. `<DataTable>`, `<Modal>`, `<EntityForm>` genéricos.
2. CRUD: Empresas, Clientes, Empreendimentos (com side effect EAP via trigger SQL).
3. Listas + formulários reativos (zod + react-hook-form).
4. Trava de delete (chamar `verificar_vinculos` RPC antes de excluir).

### Fase 3 — Financeiro (3–4 dias)
1. CRUD: Contas a Receber, Contas a Pagar, DDA.
2. Parcelamento (server action `parcelarCR` etc.).
3. Agenda (próximos vencimentos com select inline de status).
4. Comissões + comissao → CP.

### Fase 4 — Obra (4–5 dias)
1. Cronograma (view `v_cronograma_obra` com agregações).
2. Orçamentos & Cotações + agrupamento + marcar vencedor (RPC).
3. Orçamento por Etapa + atualização inline.
4. Compras (gerado de orçamento vencedor; filtros; status/prioridade inline).
5. Medições (resumo agrupado + aprovar → CP).

### Fase 5 — Dashboard + Relatórios (2–3 dias)
1. `dashboard()` RPC ou views: fluxo 6 meses, gasto por obra, atrasados, etc.
2. Charts no `/dashboard` (Recharts).
3. `/relatorios` com geração PDF cliente (port direto de `gerarRelatorioPDF`).

### Fase 6 — Admin + Logs (1 dia)
1. `/admin/usuarios` (listar, criar, editar, ativar/inativar via service role).
2. `/admin/logs` (queries em `audit_log`).
3. Trigger genérico de auditoria (ou middleware).

### Fase 7 — Migração de dados (1–2 dias)
1. Script Node que lê todas as abas via Google Sheets API.
2. Insere em massa nas tabelas Supabase (`insert ... on conflict do nothing`).
3. **Senhas:** enviar e-mail de reset para todos os usuários (não dá pra migrar hash custom direto).

### Fase 8 — QA + Cutover (2–3 dias)
1. Smoke test de todos os endpoints/fluxos.
2. Comparar números do dashboard com a planilha em paralelo.
3. Domínio próprio + HTTPS.
4. Treinar usuários nas pequenas mudanças.

**Total estimado: 19–26 dias** para um dev focado. Com Claude Code assistindo, pode cair para 12–15 dias.

---

## 10. PITFALLS / O QUE PODE PEGAR

1. **Timezones.** Apps Script usa `Session.getScriptTimeZone()`. No Postgres, todos os `timestamptz` viram UTC. Cuidado ao formatar para "pt-BR" no cliente — usar `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })`.
2. **Datas como string vazia "".** O MVP guarda data ausente como string vazia, não null. No Postgres, garantir que serialização use `null`. No formulário, transformar string vazia em null antes do insert.
3. **Booleans como 'TRUE'/'FALSE'.** Google Sheets força string. Em Postgres, será boolean nativo. O frontend novo não precisa lidar com isso.
4. **Status enum permissivo no MVP.** Os valores aceitos pelo Sheets vinham de selects no HTML; no Postgres, usar `check constraints` ou **enums Postgres** para impedir lixo. Recomendado: usar enums Postgres (mais fáceis de evoluir que checks).
5. **Conflitos de "parte_id" polimórfico** em `contratos`. Ou criar duas FKs nullable (`cliente_id`, `empresa_id`) com check garantindo que só uma está preenchida, ou manter `parte_id uuid` sem FK (mais flexível, menos seguro).
6. **`material_servico` agrupado por lower(trim()).** Manter essa lógica no `orcamento_grupos()` (RPC ou view).
7. **Geração de IDs.** Trocar o `_gerarId('PREFIXO')` por `uuid_generate_v4()` (ou gen_random_uuid). Prefixos não fazem sentido no UUID — podem virar coluna `numero_sequencial` separada se for útil pra usuário.
8. **Anti-bruteforce via logs.** Supabase Auth já tem rate limit. Não tente replicar — vai brigar com a feature nativa.
9. **`alocacao-orcamentos` inline edit.** Continua valendo: select inline dispara update. No Next, é trivial com server action + `revalidatePath`.
10. **Charts dark mode.** Recharts puxa cores via props — replicar a paleta atual.
11. **Vercel + Supabase free tier.** 500MB DB, 50k MAU. Para a Altor (empresa pequena), funciona. Para escalar, plano Pro Supabase ($25/mês) + Vercel Pro ($20/mês).
12. **PDF com caracteres acentuados.** jsPDF tem bugs com UTF-8 — testar "ção", "ç", etc. Se quebrar, embedar fonte (Roboto).

---

## 11. CHECKLIST DE CONFORMIDADE

Use esta lista pra confirmar paridade com o MVP atual:

**Cadastros**
- [ ] Empresas: 17 campos, enums de categoria
- [ ] Clientes: 17 campos, enums de tipo/origem/classificação
- [ ] Empreendimentos: 17 campos + trigger EAP
- [ ] EAP padrão: 14 etapas com pesos default

**Financeiro**
- [ ] CR: criar, editar, deletar, parcelar 2–240×, 7 periodicidades
- [ ] CP: idem + categoria + etapa_eap
- [ ] DDA: cadastro manual + status RECEBIDO/VINCULADO_CP/PAGO
- [ ] Comissões: criar + gerar CP + parcelar
- [ ] Contratos: status workflow (EM_ELABORACAO → ATIVO → DISTRATADO/ENCERRADO/INADIMPLENTE)
- [ ] Auto-fill valor_pago/data_pagamento ao marcar PAGO

**Obra**
- [ ] Cronograma com 3 custos (orçado/comprometido/pago) + % gasto colorido
- [ ] Drill-down de orçamentos vencedores por etapa
- [ ] Orçamento por etapa editável inline
- [ ] Orçamentos & Cotações com cards coloridos
- [ ] Marcar vencedor → demais viram perdedor + Compra gerada
- [ ] Alocação de orçamentos (mover entre obras inline)
- [ ] Compras: filtros (obra/status/prioridade) + inline editing
- [ ] Medições: resumo por contrato de empreitada + aprovar → CP

**Relatórios**
- [ ] PDF semanal/quinzenal/mensal com 7 seções
- [ ] Total empresa OU filtro por obra
- [ ] Header com paleta Altor

**Dashboard**
- [ ] 9 KPIs (3 destaque + 6 operacionais)
- [ ] Toggle Total Empresa × Obra
- [ ] 4 gráficos
- [ ] Empty states (sem gasto = não aparece gráfico)

**Admin**
- [ ] Listar/criar/editar/inativar usuários
- [ ] Logs de auditoria (CREATE/UPDATE/DELETE/LOGIN/LOGIN_FALHO/UPDATE_STATUS/CREATE_PARCELADO)
- [ ] Apenas ADMIN deleta
- [ ] Apenas ADMIN gerencia usuários

**Segurança**
- [ ] Senha mín. 8 chars com letras + números
- [ ] Sessão com refresh automático (janela móvel)
- [ ] RLS impedindo leituras não autorizadas
- [ ] Service role só no servidor (nunca exposto)

---

## 12. ARQUIVOS COMPLEMENTARES

- `SUPABASE_SCHEMA.sql` — DDL completo pronto pra rodar no SQL Editor do Supabase.
- `CLAUDE.md` — briefing curto pra colocar na raiz do projeto Next.js, instruindo o Claude Code sobre convenções, onde achar este mapping, e regras "duras" (nunca expor service role, sempre usar server actions pra writes, etc.).

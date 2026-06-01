-- =====================================================================
-- ALTOR — Migrações de Performance
-- =====================================================================
-- APLICAÇÃO: rode este arquivo no SQL Editor do Supabase (uma seção
-- por vez, conferindo o resultado de cada bloco antes do próximo).
--
-- Todas as instruções usam IF NOT EXISTS / CREATE OR REPLACE — podem
-- ser executadas múltiplas vezes sem efeito colateral.
--
-- Data: 2026-06-01
-- =====================================================================


-- =====================================================================
-- SEÇÃO A: ÍNDICES (cobertura para listagens e dashboard)
-- =====================================================================
-- Criados como CONCURRENTLY para não travar tabelas em produção.
-- Em Supabase SQL Editor, abra cada um em uma execução separada (o
-- CONCURRENTLY não funciona dentro de transação).
-- =====================================================================

-- Contas a pagar — filtros recorrentes: empreendimento + status + data
create index concurrently if not exists idx_cp_obra_status_venc
  on contas_pagar (empreendimento_id, status, data_vencimento desc);

create index concurrently if not exists idx_cp_status_venc
  on contas_pagar (status, data_vencimento desc)
  where status in ('ABERTO','PARCIAL','ATRASADO');

create index concurrently if not exists idx_cp_categoria
  on contas_pagar (categoria) where categoria is not null;

-- Contas a receber — mesmo padrão
create index concurrently if not exists idx_cr_obra_status_venc
  on contas_receber (empreendimento_id, status, data_vencimento desc);

create index concurrently if not exists idx_cr_status_venc
  on contas_receber (status, data_vencimento desc)
  where status in ('ABERTO','PARCIAL','ATRASADO');

-- Comissões — agenda + relatórios usam (data_prevista, empreendimento_id)
create index concurrently if not exists idx_comissoes_obra_data
  on comissoes (empreendimento_id, data_prevista desc);

-- Contratos — usados na agenda por status + vigência
create index concurrently if not exists idx_contratos_status_vigencia
  on contratos (status, data_vigencia_fim);

create index concurrently if not exists idx_contratos_obra
  on contratos (empreendimento_id);

-- Medições — listagem por data
create index concurrently if not exists idx_medicoes_obra_data
  on medicoes (empreendimento_id, data_medicao desc);

-- Compras — listagem por aprovação
create index concurrently if not exists idx_compras_obra_aprov
  on compras (empreendimento_id, data_aprovacao desc);

-- Orçamentos — ordenação composta usada pela listagem
create index concurrently if not exists idx_orc_obra_etapa_grupo
  on orcamentos (empreendimento_id, etapa, grupo_cotacao);

-- Empreendimentos — filtro por status no dashboard
create index concurrently if not exists idx_empreend_status
  on empreendimentos (status);


-- =====================================================================
-- SEÇÃO B: RPC — agregados do Dashboard
-- =====================================================================
-- Substituem queries que carregam linhas inteiras e somam no Node.
-- Postgres soma direto e retorna 1 linha. Economia típica: 80-95% do
-- payload + redução de ~200-500ms de tempo de query.
-- =====================================================================

-- B.1 — Totais financeiros (recebido + pago + saldo)
create or replace function dashboard_totais(p_obra_id uuid default null)
returns table (
  total_recebido numeric,
  total_pago     numeric,
  saldo_caixa    numeric
)
language sql
stable
security invoker
as $$
  with cr as (
    select coalesce(sum(valor_pago), 0)::numeric as v
    from contas_receber
    where status = 'PAGO'
      and (p_obra_id is null or empreendimento_id = p_obra_id)
  ),
  cp as (
    select coalesce(sum(valor_pago), 0)::numeric as v
    from contas_pagar
    where status = 'PAGO'
      and (p_obra_id is null or empreendimento_id = p_obra_id)
  )
  select cr.v, cp.v, (cr.v - cp.v) from cr, cp;
$$;

-- B.2 — CP agregado por obra (para o gráfico de pizza)
create or replace function dashboard_cp_por_obra(p_obra_id uuid default null)
returns table (
  empreendimento_id uuid,
  total             numeric
)
language sql
stable
security invoker
as $$
  select cp.empreendimento_id,
         coalesce(sum(cp.valor_original), 0)::numeric as total
  from contas_pagar cp
  where cp.empreendimento_id is not null
    and (p_obra_id is null or cp.empreendimento_id = p_obra_id)
  group by cp.empreendimento_id
  order by total desc;
$$;

-- B.3 — Métricas 30d (a receber / a pagar / atrasado)
-- Útil se você quiser remover a varredura JS no Node e fazer tudo em SQL.
create or replace function dashboard_metricas_30d(p_obra_id uuid default null)
returns table (
  a_receber_30   numeric,
  a_pagar_30     numeric,
  atrasado_cr    numeric,
  atrasado_cp    numeric
)
language sql
stable
security invoker
as $$
  with hoje as (select current_date as d),
  proximos_30 as (select current_date + interval '30 days' as d)
  select
    coalesce((
      select sum(valor_aberto) from contas_receber, hoje, proximos_30
      where status not in ('PAGO','CANCELADO')
        and data_vencimento >= hoje.d
        and data_vencimento <= proximos_30.d
        and (p_obra_id is null or empreendimento_id = p_obra_id)
    ), 0)::numeric,
    coalesce((
      select sum(valor_aberto) from contas_pagar, hoje, proximos_30
      where status not in ('PAGO','CANCELADO')
        and data_vencimento >= hoje.d
        and data_vencimento <= proximos_30.d
        and (p_obra_id is null or empreendimento_id = p_obra_id)
    ), 0)::numeric,
    coalesce((
      select sum(valor_aberto) from contas_receber, hoje
      where status not in ('PAGO','CANCELADO')
        and data_vencimento < hoje.d
        and (p_obra_id is null or empreendimento_id = p_obra_id)
    ), 0)::numeric,
    coalesce((
      select sum(valor_aberto) from contas_pagar, hoje
      where status not in ('PAGO','CANCELADO')
        and data_vencimento < hoje.d
        and (p_obra_id is null or empreendimento_id = p_obra_id)
    ), 0)::numeric;
$$;


-- =====================================================================
-- SEÇÃO C: VERIFICAÇÃO
-- =====================================================================
-- Rode estes selects depois de aplicar tudo para confirmar.
-- =====================================================================

-- Listar índices criados
-- select indexname from pg_indexes
-- where schemaname = 'public'
--   and indexname like 'idx_%'
-- order by indexname;

-- Testar RPCs (substitua a uuid pelo id de uma obra real, ou deixe null)
-- select * from dashboard_totais(null);
-- select * from dashboard_cp_por_obra(null);
-- select * from dashboard_metricas_30d(null);

-- Explain analyze nos queries mais quentes (com obra_id real)
-- explain analyze
-- select valor_pago from contas_pagar where status = 'PAGO';

-- explain analyze
-- select * from contas_pagar where empreendimento_id = '<uuid>'
-- order by data_vencimento desc limit 500;

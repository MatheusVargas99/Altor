-- =====================================================================
-- ALTOR — Importação de cronograma do MS Project (XML/MSPDI)
-- =====================================================================
-- Migração: cronograma_tarefas_msproject.
--
-- As 14 etapas de `cronograma` continuam sendo a espinha do financeiro: as
-- contas a pagar, compras, medições e orçamentos apontam para o enum
-- etapa_eap. As tarefas do MS Project ficam em `cronograma_tarefas`, com a
-- hierarquia completa, e cada uma pode ser ligada a uma etapa.
--
-- Regras da importação (uma transação só):
--   * as tarefas da obra são sempre substituídas pelas do arquivo;
--   * só tarefas folha (não resumo) ligadas a uma etapa alimentam a etapa;
--   * etapa sem tarefa ligada não é tocada;
--   * datas: menor início e maior fim das tarefas;
--   * % físico: média das tarefas ponderada pela duração em dias;
--   * custo: soma das tarefas.
-- Cada atualização é opcional, porque o % e o custo lançados no sistema podem
-- ser mais recentes do que os do arquivo.
-- =====================================================================

create table public.cronograma_tarefas (
  id                 uuid primary key default gen_random_uuid(),
  empreendimento_id  uuid not null references public.empreendimentos(id) on delete cascade,
  ordem              integer not null,
  uid_msproject      text,
  wbs                text,
  nivel              integer not null default 1,
  resumo             boolean not null default false,
  marco              boolean not null default false,
  nome               text not null,
  data_inicio        date,
  data_fim           date,
  percentual_fisico  numeric(5,2) not null default 0
                     check (percentual_fisico between 0 and 100),
  custo_orcado       numeric(14,2) not null default 0,
  etapa              public.etapa_eap,
  criado_em          timestamptz not null default now(),
  criado_por         uuid references auth.users(id) on delete set null
);

create index idx_cronograma_tarefas_obra
  on public.cronograma_tarefas (empreendimento_id, ordem);

alter table public.cronograma_tarefas enable row level security;

create policy "auth select" on public.cronograma_tarefas
  for select to authenticated using (is_active_user());
create policy "auth insert" on public.cronograma_tarefas
  for insert to authenticated with check (is_active_user());
create policy "auth delete" on public.cronograma_tarefas
  for delete to authenticated using (is_active_user());

create or replace function public.importar_cronograma_msproject(
  p_empreendimento_id uuid,
  p_tarefas           jsonb,
  p_atualizar_datas   boolean default true,
  p_atualizar_fisico  boolean default false,
  p_atualizar_custo   boolean default false
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_tarefas integer;
  v_etapas  integer := 0;
begin
  if not is_active_user() then
    raise exception 'Não autorizado';
  end if;
  if jsonb_typeof(p_tarefas) is distinct from 'array' or jsonb_array_length(p_tarefas) = 0 then
    raise exception 'Nenhuma tarefa para importar';
  end if;

  delete from cronograma_tarefas where empreendimento_id = p_empreendimento_id;

  insert into cronograma_tarefas (
    empreendimento_id, ordem, uid_msproject, wbs, nivel, resumo, marco, nome,
    data_inicio, data_fim, percentual_fisico, custo_orcado, etapa, criado_por
  )
  select
    p_empreendimento_id, t.ordem, t.uid_msproject, t.wbs, t.nivel, t.resumo, t.marco, t.nome,
    t.data_inicio, t.data_fim, t.percentual_fisico, t.custo_orcado, t.etapa, v_user
  from jsonb_to_recordset(p_tarefas) as t(
    ordem integer, uid_msproject text, wbs text, nivel integer, resumo boolean,
    marco boolean, nome text, data_inicio date, data_fim date,
    percentual_fisico numeric, custo_orcado numeric, etapa etapa_eap
  );
  get diagnostics v_tarefas = row_count;

  if p_atualizar_datas or p_atualizar_fisico or p_atualizar_custo then
    with folhas as (
      select
        etapa, data_inicio, data_fim, percentual_fisico, custo_orcado,
        greatest(coalesce(data_fim - data_inicio, 0) + 1, 1) as dias
      from cronograma_tarefas
      where empreendimento_id = p_empreendimento_id
        and etapa is not null
        and not resumo
    ),
    por_etapa as (
      select
        etapa,
        min(data_inicio) as inicio,
        max(data_fim) as fim,
        round(sum(percentual_fisico * dias) / sum(dias), 2) as fisico,
        sum(custo_orcado) as custo
      from folhas
      group by etapa
    )
    update cronograma c set
      data_inicio_prevista = case when p_atualizar_datas
        then coalesce(a.inicio, c.data_inicio_prevista) else c.data_inicio_prevista end,
      data_fim_prevista = case when p_atualizar_datas
        then coalesce(a.fim, c.data_fim_prevista) else c.data_fim_prevista end,
      percentual_fisico = case when p_atualizar_fisico
        then a.fisico else c.percentual_fisico end,
      custo_orcado = case when p_atualizar_custo
        then a.custo else c.custo_orcado end,
      status = case when p_atualizar_fisico and c.status <> 'PAUSADA' then
        (case when a.fisico >= 100 then 'CONCLUIDA'
              when a.fisico > 0 then 'EM_ANDAMENTO'
              else 'NAO_INICIADA' end)::cronograma_status
        else c.status end,
      atualizado_por = v_user
    from por_etapa a
    where c.empreendimento_id = p_empreendimento_id
      and c.etapa = a.etapa;
    get diagnostics v_etapas = row_count;
  end if;

  return jsonb_build_object('tarefas', v_tarefas, 'etapas', v_etapas);
end;
$$;

revoke all on function public.importar_cronograma_msproject(uuid, jsonb, boolean, boolean, boolean)
  from public, anon;
grant execute on function public.importar_cronograma_msproject(uuid, jsonb, boolean, boolean, boolean)
  to authenticated, service_role;

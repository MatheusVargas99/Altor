-- =====================================================================
-- ALTOR — Status "atrasado" automático
-- =====================================================================
-- Aplicado em produção em 2026-10-20 (migrações
-- cp_status_atrasado_automatico + status_atrasado_automatico_cr_cronograma).
--
-- Regras ("hoje" no fuso de Brasília; vence no dia D -> atrasado em D+1):
--   * contas_pagar / contas_receber: ABERTO/PARCIAL com data_vencimento
--     passada -> ATRASADO. Vencimento adiado: ATRASADO volta a ABERTO (ou
--     PARCIAL, se já houve pagamento). PAGO e CANCELADO nunca são tocados.
--   * cronograma: NAO_INICIADA/EM_ANDAMENTO com data_fim_prevista passada,
--     sem data_fim_real e com menos de 100% -> ATRASADA. Prazo adiado:
--     ATRASADA volta a EM_ANDAMENTO (se já iniciou) ou NAO_INICIADA.
--     PAUSADA e CONCLUIDA nunca são tocadas.
--
-- Três caminhos garantem a regra:
--   1. triggers BEFORE INSERT/UPDATE (ao salvar/editar);
--   2. pg_cron diário às 03:05 UTC = 00:05 de Brasília;
--   3. o app chama atualizar_status_atrasados() ao abrir Contas a Pagar,
--      Contas a Receber, Cronograma e Agenda (cobre o banco ter ficado
--      pausado na hora do cron).
-- =====================================================================

create or replace function fn_cp_status_por_vencimento()
returns trigger language plpgsql set search_path = public as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if NEW.status in ('ABERTO', 'PARCIAL') and NEW.data_vencimento < v_hoje then
    NEW.status := 'ATRASADO'::cp_status;
  elsif NEW.status = 'ATRASADO' and NEW.data_vencimento >= v_hoje then
    -- vencimento adiado: volta a aberto (ou parcial, se já houve pagamento)
    NEW.status := (case when coalesce(NEW.valor_pago, 0) > 0 then 'PARCIAL' else 'ABERTO' end)::cp_status;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_contas_pagar_status_vencimento on contas_pagar;
create trigger trg_contas_pagar_status_vencimento
before insert or update on contas_pagar
for each row execute function fn_cp_status_por_vencimento();

create or replace function fn_cr_status_por_vencimento()
returns trigger language plpgsql set search_path = public as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if NEW.status in ('ABERTO', 'PARCIAL') and NEW.data_vencimento < v_hoje then
    NEW.status := 'ATRASADO'::cr_status;
  elsif NEW.status = 'ATRASADO' and NEW.data_vencimento >= v_hoje then
    NEW.status := (case when coalesce(NEW.valor_pago, 0) > 0 then 'PARCIAL' else 'ABERTO' end)::cr_status;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_contas_receber_status_vencimento on contas_receber;
create trigger trg_contas_receber_status_vencimento
before insert or update on contas_receber
for each row execute function fn_cr_status_por_vencimento();

create or replace function fn_cronograma_status_por_prazo()
returns trigger language plpgsql set search_path = public as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if NEW.status in ('NAO_INICIADA', 'EM_ANDAMENTO')
     and NEW.data_fim_prevista < v_hoje
     and NEW.data_fim_real is null
     and coalesce(NEW.percentual_fisico, 0) < 100 then
    NEW.status := 'ATRASADA'::cronograma_status;
  elsif NEW.status = 'ATRASADA'
     and (NEW.data_fim_prevista is null or NEW.data_fim_prevista >= v_hoje) then
    NEW.status := (case
      when NEW.data_inicio_real is not null or coalesce(NEW.percentual_fisico, 0) > 0
      then 'EM_ANDAMENTO' else 'NAO_INICIADA' end)::cronograma_status;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_cronograma_status_prazo on cronograma;
create trigger trg_cronograma_status_prazo
before insert or update on cronograma
for each row execute function fn_cronograma_status_por_prazo();

-- Varredura única: o que ficou atrasado com a passagem do tempo (sem edição).
create or replace function atualizar_status_atrasados()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_qtd  integer;
  v_tot  integer := 0;
begin
  update contas_pagar set status = 'ATRASADO'::cp_status
   where status in ('ABERTO', 'PARCIAL') and data_vencimento < v_hoje;
  get diagnostics v_qtd = row_count; v_tot := v_tot + v_qtd;

  update contas_receber set status = 'ATRASADO'::cr_status
   where status in ('ABERTO', 'PARCIAL') and data_vencimento < v_hoje;
  get diagnostics v_qtd = row_count; v_tot := v_tot + v_qtd;

  update cronograma set status = 'ATRASADA'::cronograma_status
   where status in ('NAO_INICIADA', 'EM_ANDAMENTO')
     and data_fim_prevista < v_hoje
     and data_fim_real is null
     and coalesce(percentual_fisico, 0) < 100;
  get diagnostics v_qtd = row_count; v_tot := v_tot + v_qtd;

  return v_tot;
end;
$$;
revoke all on function atualizar_status_atrasados() from public, anon;
grant execute on function atualizar_status_atrasados() to authenticated, service_role;

create extension if not exists pg_cron;
select cron.schedule('status-atrasados-diario', '5 3 * * *', 'select public.atualizar_status_atrasados()');

select atualizar_status_atrasados();

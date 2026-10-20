-- =====================================================================
-- ALTOR — Conta a pagar vencida vira ATRASADO automaticamente
-- =====================================================================
-- Aplicado em produção em 2026-10-20 (migração cp_status_atrasado_automatico).
--
-- Regra: conta ABERTO/PARCIAL com data_vencimento anterior a hoje (fuso
-- de Brasília) passa a ATRASADO. Vence no dia D -> atrasada a partir de D+1.
-- Se o vencimento for adiado, ATRASADO volta a ABERTO (ou PARCIAL, se já
-- houve pagamento). PAGO e CANCELADO nunca são tocados.
--
-- Três caminhos garantem a regra:
--   1. trigger BEFORE INSERT/UPDATE (ao salvar/editar a conta);
--   2. pg_cron diário às 03:05 UTC = 00:05 de Brasília;
--   3. o app chama atualizar_cp_atrasadas() ao abrir /contas-pagar
--      (cobre o caso de o banco estar pausado na hora do cron).
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

-- Varredura: contas que venceram com a passagem do tempo (sem edição).
create or replace function atualizar_cp_atrasadas()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_qtd integer;
begin
  update contas_pagar
     set status = 'ATRASADO'::cp_status
   where status in ('ABERTO', 'PARCIAL')
     and data_vencimento < (now() at time zone 'America/Sao_Paulo')::date;
  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$$;
revoke all on function atualizar_cp_atrasadas() from public, anon;
grant execute on function atualizar_cp_atrasadas() to authenticated, service_role;

create extension if not exists pg_cron;
select cron.schedule('cp-atrasadas-diario', '5 3 * * *', 'select public.atualizar_cp_atrasadas()');

select atualizar_cp_atrasadas();

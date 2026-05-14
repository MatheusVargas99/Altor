-- =====================================================================
-- SISTEMA DE GESTÃO ALTOR — Schema Supabase (Postgres)
-- =====================================================================
-- Rode em ordem no SQL Editor do Supabase (ou via supabase migration new).
-- Pressupõe um projeto Supabase já criado com Auth habilitado.
-- =====================================================================

-- =====================================================================
-- SECTION 0: EXTENSIONS
-- =====================================================================
create extension if not exists "uuid-ossp";

-- =====================================================================
-- SECTION 1: ENUMS
-- =====================================================================
create type user_role          as enum ('ADMIN','OPERACIONAL');

create type empresa_categoria  as enum (
  'EMPREITEIRA','FORNECEDOR_MATERIAL','SERVICO','PROJETISTA',
  'IMOBILIARIA','INSTITUICAO_FINANCEIRA','OUTROS'
);

create type tipo_pessoa        as enum ('PF','PJ');
create type cliente_origem     as enum ('INDICACAO','SITE','IMOBILIARIA','MARKETING','OUTROS');
create type cliente_classif    as enum ('INVESTIDOR','PRIMEIRA_MORADIA','UPGRADE','OUTROS');

create type empreend_status    as enum ('PLANEJAMENTO','EM_OBRA','ENTREGUE','PAUSADO','CANCELADO');

create type etapa_eap          as enum (
  'M0_PRELIMINARES','M0_TERRAPLENAGEM',
  'M1_FUNDACAO','M2_ESTRUTURA',
  'M3_ALVENARIA','M3_INSTALACOES_HIDRAULICAS','M3_INSTALACOES_ELETRICAS',
  'M4_REVESTIMENTO','M4_ESQUADRIAS','M4_PINTURA','M4_LOUCAS_METAIS',
  'M5_AREA_COMUM','M6_HABITESE','M7_ENTREGA'
);

create type cronograma_status  as enum ('NAO_INICIADA','EM_ANDAMENTO','CONCLUIDA','ATRASADA','PAUSADA');

create type cr_categoria       as enum ('VENDA_UNIDADE','INVESTIDOR','ALUGUEL','OUTROS');
create type cp_categoria       as enum (
  'MATERIAL','MAO_DE_OBRA','EMPREITADA','PROJETO','LICENCAS_TAXAS',
  'MARKETING','ADMINISTRATIVO','JURIDICO','IMPOSTO','OUTROS'
);
create type cr_status          as enum ('ABERTO','PARCIAL','PAGO','ATRASADO','CANCELADO');
create type cp_status          as enum ('ABERTO','PARCIAL','PAGO','ATRASADO','CANCELADO');
create type cr_forma           as enum ('BOLETO','PIX','TRANSFERENCIA','FINANCIAMENTO_CAIXA','OUTROS');
create type cp_forma           as enum ('BOLETO','PIX','TRANSFERENCIA','CARTAO','DINHEIRO');
create type cp_origem          as enum ('MANUAL','DDA','IMPORTACAO');

create type orcamento_unidade  as enum ('UN','KG','M2','M3','VB','MES','H');
create type orcamento_status   as enum ('PENDENTE','VENCEDOR','PERDEDOR','EM_ANALISE','CANCELADO');

create type comissao_benef     as enum ('CORRETOR_AUTONOMO','IMOBILIARIA','FUNCIONARIO_INTERNO','INDICADOR');
create type comissao_gatilho   as enum ('ASSINATURA','HABITE_SE','ENTREGA_CHAVES','PERSONALIZADO');
create type comissao_status    as enum ('PREVISTA','A_PAGAR','PAGA','RETIDA','CANCELADA');

create type contrato_tipo      as enum ('COMPRA_VENDA','EMPREITADA','FORNECIMENTO','PRESTACAO_SERVICO','INVESTIMENTO','LOCACAO','OUTROS');
create type contrato_parte     as enum ('CLIENTE','EMPRESA');
create type contrato_status    as enum ('EM_ELABORACAO','ATIVO','DISTRATADO','ENCERRADO','INADIMPLENTE');

create type dda_banco          as enum ('ITAU','BRADESCO','BB','SICREDI','SANTANDER','OUTROS');
create type dda_status         as enum ('RECEBIDO','VINCULADO_CP','PAGO','IGNORADO','CANCELADO');

create type compra_prioridade  as enum ('URGENTE','MODERADA','NORMAL');
create type compra_status      as enum ('ABERTO','EM_NEGOCIACAO','COMPRADO','RECEBIDO','CANCELADO');

create type medicao_status     as enum ('PREVISTA','MEDIDA','APROVADA','PAGA','CANCELADA');

-- =====================================================================
-- SECTION 2: PROFILES (vinculado a auth.users)
-- =====================================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  role        user_role not null default 'OPERACIONAL',
  ativo       boolean not null default true,
  ultimo_login timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Trigger: cria profile automaticamente quando um usuário é criado em auth.users
create or replace function fn_handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email));
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function fn_handle_new_user();

-- =====================================================================
-- SECTION 3: TABELAS PRINCIPAIS
-- =====================================================================

-- 3.1 empresas
create table empresas (
  id                    uuid primary key default uuid_generate_v4(),
  razao_social          text not null,
  nome_fantasia         text,
  cnpj                  text,
  inscricao_estadual    text,
  categoria             empresa_categoria,
  email                 text,
  telefone              text,
  contato_responsavel   text,
  endereco              text,
  cidade                text,
  uf                    text,
  chave_pix             text,
  banco                 text,
  agencia               text,
  conta                 text,
  observacoes           text,
  ativo                 boolean not null default true,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now(),
  criado_por            uuid references auth.users(id),
  atualizado_por        uuid references auth.users(id)
);
create index idx_empresas_categoria on empresas(categoria);
create index idx_empresas_ativo on empresas(ativo);

-- 3.2 clientes
create table clientes (
  id                uuid primary key default uuid_generate_v4(),
  nome_completo     text not null,
  tipo_pessoa       tipo_pessoa,
  cpf_cnpj          text,
  rg                text,
  data_nascimento   date,
  estado_civil      text,
  profissao         text,
  email             text,
  telefone          text,
  endereco          text,
  cidade            text,
  uf                text,
  origem_lead       cliente_origem,
  classificacao     cliente_classif,
  observacoes       text,
  ativo             boolean not null default true,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),
  criado_por        uuid references auth.users(id),
  atualizado_por    uuid references auth.users(id)
);
create index idx_clientes_ativo on clientes(ativo);

-- 3.3 empreendimentos
create table empreendimentos (
  id                        uuid primary key default uuid_generate_v4(),
  nome                      text not null,
  codigo_curto              text,
  endereco                  text,
  cidade                    text,
  uf                        text,
  area_terreno              numeric(12,2),
  area_construida           numeric(12,2),
  n_unidades                integer,
  vgv_estimado              numeric(14,2),
  custo_total_estimado      numeric(14,2),
  data_inicio_prevista      date,
  data_entrega_prevista     date,
  data_inicio_real          date,
  data_entrega_real         date,
  status                    empreend_status default 'PLANEJAMENTO',
  observacoes               text,
  criado_em                 timestamptz not null default now(),
  atualizado_em             timestamptz not null default now(),
  criado_por                uuid references auth.users(id),
  atualizado_por            uuid references auth.users(id)
);
create index idx_empreend_status on empreendimentos(status);

-- 3.4 cronograma (EAP)
create table cronograma (
  id                        uuid primary key default uuid_generate_v4(),
  empreendimento_id         uuid not null references empreendimentos(id) on delete restrict,
  etapa                     etapa_eap not null,
  marco                     text not null,
  descricao                 text,
  ordem                     integer not null,
  data_inicio_prevista      date,
  data_fim_prevista         date,
  data_inicio_real          date,
  data_fim_real             date,
  custo_orcado              numeric(14,2) default 0,
  custo_realizado           numeric(14,2) default 0,
  percentual_fisico         numeric(5,2) default 0,
  peso                      numeric(6,4) default 0,
  status                    cronograma_status default 'NAO_INICIADA',
  responsavel_id            uuid references empresas(id) on delete set null,
  observacoes               text,
  criado_em                 timestamptz not null default now(),
  atualizado_em             timestamptz not null default now(),
  criado_por                uuid references auth.users(id),
  atualizado_por            uuid references auth.users(id),
  unique (empreendimento_id, etapa)
);
create index idx_cronograma_obra on cronograma(empreendimento_id);

-- Trigger: cria EAP padrão ao inserir Empreendimento
create or replace function fn_criar_eap_padrao() returns trigger
language plpgsql as $$
begin
  insert into cronograma (empreendimento_id, etapa, marco, descricao, ordem, peso, status, criado_por, atualizado_por)
  values
    (new.id, 'M0_PRELIMINARES',             'M0', 'Serviços preliminares e canteiro',     1,  0.03, 'NAO_INICIADA', new.criado_por, new.criado_por),
    (new.id, 'M0_TERRAPLENAGEM',            'M0', 'Movimento de terra e contenções',      2,  0.04, 'NAO_INICIADA', new.criado_por, new.criado_por),
    (new.id, 'M1_FUNDACAO',                 'M1', 'Estacas, blocos, baldrames',           3,  0.10, 'NAO_INICIADA', new.criado_por, new.criado_por),
    (new.id, 'M2_ESTRUTURA',                'M2', 'Pilares, vigas, lajes (até cobertura)',4,  0.18, 'NAO_INICIADA', new.criado_por, new.criado_por),
    (new.id, 'M3_ALVENARIA',                'M3', 'Vedação interna e externa',            5,  0.08, 'NAO_INICIADA', new.criado_por, new.criado_por),
    (new.id, 'M3_INSTALACOES_HIDRAULICAS',  'M3', 'Hidrossanitário e gás',                6,  0.06, 'NAO_INICIADA', new.criado_por, new.criado_por),
    (new.id, 'M3_INSTALACOES_ELETRICAS',    'M3', 'Elétrica e dados',                     7,  0.06, 'NAO_INICIADA', new.criado_por, new.criado_por),
    (new.id, 'M4_REVESTIMENTO',             'M4', 'Reboco, contrapiso, cerâmica',         8,  0.10, 'NAO_INICIADA', new.criado_por, new.criado_por),
    (new.id, 'M4_ESQUADRIAS',               'M4', 'Portas, janelas, vidros',              9,  0.06, 'NAO_INICIADA', new.criado_por, new.criado_por),
    (new.id, 'M4_PINTURA',                  'M4', 'Massa, selador, tinta',                10, 0.05, 'NAO_INICIADA', new.criado_por, new.criado_por),
    (new.id, 'M4_LOUCAS_METAIS',            'M4', 'Bancadas, louças, metais',             11, 0.04, 'NAO_INICIADA', new.criado_por, new.criado_por),
    (new.id, 'M5_AREA_COMUM',               'M5', 'Hall, garagem, fachada, paisagismo',   12, 0.10, 'NAO_INICIADA', new.criado_por, new.criado_por),
    (new.id, 'M6_HABITESE',                 'M6', 'Vistorias e habite-se',                13, 0.06, 'NAO_INICIADA', new.criado_por, new.criado_por),
    (new.id, 'M7_ENTREGA',                  'M7', 'Entrega das chaves',                   14, 0.04, 'NAO_INICIADA', new.criado_por, new.criado_por);
  return new;
end;
$$;

create trigger trg_criar_eap_padrao
  after insert on empreendimentos
  for each row execute function fn_criar_eap_padrao();

-- 3.5 contas_receber
create table contas_receber (
  id                  uuid primary key default uuid_generate_v4(),
  empreendimento_id   uuid references empreendimentos(id) on delete restrict,
  cliente_id          uuid references clientes(id) on delete restrict,
  descricao           text not null,
  categoria           cr_categoria,
  numero_parcela      text,
  valor_original      numeric(14,2) not null check (valor_original > 0),
  valor_pago          numeric(14,2) not null default 0 check (valor_pago >= 0),
  valor_aberto        numeric(14,2) generated always as (valor_original - valor_pago) stored,
  data_emissao        date,
  data_vencimento     date not null,
  data_pagamento      date,
  forma_recebimento   cr_forma,
  status              cr_status default 'ABERTO',
  juros_multa         numeric(14,2) default 0,
  observacoes         text,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  criado_por          uuid references auth.users(id),
  atualizado_por      uuid references auth.users(id)
);
create index idx_cr_obra on contas_receber(empreendimento_id);
create index idx_cr_cliente on contas_receber(cliente_id);
create index idx_cr_venc on contas_receber(data_vencimento);
create index idx_cr_status on contas_receber(status);

-- 3.6 contas_pagar
create table contas_pagar (
  id                  uuid primary key default uuid_generate_v4(),
  empreendimento_id   uuid references empreendimentos(id) on delete restrict,
  empresa_id          uuid references empresas(id) on delete restrict,
  descricao           text not null,
  categoria           cp_categoria,
  etapa_eap           etapa_eap,
  numero_documento    text,
  valor_original      numeric(14,2) not null check (valor_original > 0),
  valor_pago          numeric(14,2) not null default 0 check (valor_pago >= 0),
  valor_aberto        numeric(14,2) generated always as (valor_original - valor_pago) stored,
  data_emissao        date,
  data_vencimento     date not null,
  data_pagamento      date,
  forma_pagamento     cp_forma,
  status              cp_status default 'ABERTO',
  origem              cp_origem default 'MANUAL',
  linha_digitavel     text,
  anexo_url           text,
  observacoes         text,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  criado_por          uuid references auth.users(id),
  atualizado_por      uuid references auth.users(id)
);
create index idx_cp_obra on contas_pagar(empreendimento_id);
create index idx_cp_empresa on contas_pagar(empresa_id);
create index idx_cp_venc on contas_pagar(data_vencimento);
create index idx_cp_status on contas_pagar(status);
create index idx_cp_etapa on contas_pagar(etapa_eap);

-- 3.7 orcamentos
create table orcamentos (
  id                    uuid primary key default uuid_generate_v4(),
  empreendimento_id     uuid references empreendimentos(id) on delete restrict,
  etapa                 etapa_eap not null,
  grupo_cotacao         text not null,
  material_servico      text not null,
  descricao_detalhada   text,
  unidade               orcamento_unidade,
  quantidade            numeric(14,4) default 0,
  valor_unitario        numeric(14,4) default 0,
  valor_total           numeric(14,2) generated always as (quantidade * valor_unitario) stored,
  empresa_id            uuid references empresas(id) on delete restrict,
  prazo_entrega_dias    integer,
  condicao_pagamento    text,
  data_cotacao          date,
  validade_proposta     date,
  status                orcamento_status default 'PENDENTE',
  observacoes           text,
  anexo_url             text,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now(),
  criado_por            uuid references auth.users(id),
  atualizado_por        uuid references auth.users(id)
);
create index idx_orc_obra on orcamentos(empreendimento_id);
create index idx_orc_etapa on orcamentos(etapa);
create index idx_orc_empresa on orcamentos(empresa_id);
create index idx_orc_status on orcamentos(status);
create index idx_orc_grupo on orcamentos(empreendimento_id, etapa, lower(trim(material_servico)));

-- 3.8 comissoes
create table comissoes (
  id                      uuid primary key default uuid_generate_v4(),
  empreendimento_id       uuid references empreendimentos(id) on delete restrict,
  cliente_id              uuid references clientes(id) on delete restrict,
  beneficiario_tipo       comissao_benef,
  beneficiario_id         uuid references empresas(id) on delete set null,
  beneficiario_nome       text not null,
  valor_venda             numeric(14,2) not null check (valor_venda >= 0),
  percentual              numeric(6,3) default 0,
  valor_comissao_total    numeric(14,2) generated always as (valor_venda * percentual / 100) stored,
  parcela                 text,
  valor_parcela           numeric(14,2) not null check (valor_parcela > 0),
  evento_gatilho          comissao_gatilho,
  data_prevista           date,
  data_paga               date,
  status                  comissao_status default 'PREVISTA',
  conta_pagar_id          uuid references contas_pagar(id) on delete set null,
  observacoes             text,
  criado_em               timestamptz not null default now(),
  atualizado_em           timestamptz not null default now(),
  criado_por              uuid references auth.users(id),
  atualizado_por          uuid references auth.users(id)
);
create index idx_com_obra on comissoes(empreendimento_id);
create index idx_com_cliente on comissoes(cliente_id);
create index idx_com_status on comissoes(status);

-- 3.9 contratos
create table contratos (
  id                      uuid primary key default uuid_generate_v4(),
  numero                  text not null,
  tipo                    contrato_tipo,
  empreendimento_id       uuid references empreendimentos(id) on delete restrict,
  parte_tipo              contrato_parte,
  parte_cliente_id        uuid references clientes(id) on delete restrict,
  parte_empresa_id        uuid references empresas(id) on delete restrict,
  parte_nome              text not null,
  objeto                  text,
  valor_total             numeric(14,2),
  forma_pagamento         text,
  data_assinatura         date,
  data_vigencia_inicio    date,
  data_vigencia_fim       date,
  status                  contrato_status default 'EM_ELABORACAO',
  arquivo_url             text,
  observacoes             text,
  criado_em               timestamptz not null default now(),
  atualizado_em           timestamptz not null default now(),
  criado_por              uuid references auth.users(id),
  atualizado_por          uuid references auth.users(id),
  -- Garante que apenas uma das partes seja preenchida
  check (
    (parte_cliente_id is not null and parte_empresa_id is null) or
    (parte_cliente_id is null and parte_empresa_id is not null) or
    (parte_cliente_id is null and parte_empresa_id is null)
  )
);
create index idx_con_obra on contratos(empreendimento_id);
create index idx_con_status on contratos(status);

-- 3.10 dda
create table dda (
  id                      uuid primary key default uuid_generate_v4(),
  banco_origem            dda_banco,
  data_disponibilizacao   date,
  beneficiario_nome       text,
  beneficiario_cnpj       text,
  nosso_numero            text,
  linha_digitavel         text,
  codigo_barras           text,
  valor                   numeric(14,2),
  data_vencimento         date,
  data_emissao            date,
  status                  dda_status default 'RECEBIDO',
  conta_pagar_id          uuid references contas_pagar(id) on delete set null,
  importado_em            timestamptz default now(),
  observacoes             text
);
create index idx_dda_status on dda(status);

-- 3.11 compras
create table compras (
  id                      uuid primary key default uuid_generate_v4(),
  empreendimento_id       uuid not null references empreendimentos(id) on delete restrict,
  etapa                   etapa_eap,
  material_servico        text not null,
  descricao_detalhada     text,
  unidade                 orcamento_unidade,
  quantidade              numeric(14,4) default 0,
  empresa_id              uuid references empresas(id) on delete restrict,
  empresa_nome            text,
  valor_total             numeric(14,2) default 0,
  condicao_pagamento      text,
  prazo_entrega_dias      integer,
  prioridade              compra_prioridade not null default 'NORMAL',
  status                  compra_status not null default 'ABERTO',
  data_aprovacao          date default current_date,
  data_compra             date,
  data_recebimento        date,
  numero_pedido           text,
  orcamento_id            uuid references orcamentos(id) on delete restrict,
  observacoes             text,
  criado_em               timestamptz not null default now(),
  atualizado_em           timestamptz not null default now(),
  criado_por              uuid references auth.users(id),
  atualizado_por          uuid references auth.users(id)
);
create index idx_cmp_obra on compras(empreendimento_id);
create index idx_cmp_status on compras(status);
create index idx_cmp_prioridade on compras(prioridade);
create index idx_cmp_orcamento on compras(orcamento_id);

-- 3.12 medicoes
create table medicoes (
  id                      uuid primary key default uuid_generate_v4(),
  empreendimento_id       uuid not null references empreendimentos(id) on delete restrict,
  empresa_id              uuid not null references empresas(id) on delete restrict,
  etapa                   etapa_eap,
  descricao               text not null,
  valor_orcado            numeric(14,2) not null,
  numero_medicao          text,
  valor_medicao           numeric(14,2) not null check (valor_medicao >= 0),
  percentual_medicao      numeric(5,2) default 0,
  data_medicao            date,
  data_pagamento          date,
  status                  medicao_status default 'PREVISTA',
  conta_pagar_id          uuid references contas_pagar(id) on delete set null,
  observacoes             text,
  criado_em               timestamptz not null default now(),
  atualizado_em           timestamptz not null default now(),
  criado_por              uuid references auth.users(id),
  atualizado_por          uuid references auth.users(id)
);
create index idx_med_obra on medicoes(empreendimento_id);
create index idx_med_empresa on medicoes(empresa_id);
create index idx_med_status on medicoes(status);

-- 3.13 audit_log (auditoria centralizada)
create table audit_log (
  id              uuid primary key default uuid_generate_v4(),
  ts              timestamptz not null default now(),
  usuario_id      uuid references auth.users(id),
  usuario_email   text,
  acao            text not null,
  entidade        text not null,
  entidade_id     uuid,
  dados_antes     jsonb,
  dados_depois    jsonb,
  ip              inet
);
create index idx_audit_ts on audit_log(ts desc);
create index idx_audit_entidade on audit_log(entidade, entidade_id);
create index idx_audit_usuario on audit_log(usuario_id);

-- =====================================================================
-- SECTION 4: TRIGGERS DE atualizado_em
-- =====================================================================
create or replace function fn_set_atualizado_em() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'empresas','clientes','empreendimentos','cronograma',
    'contas_receber','contas_pagar','orcamentos','comissoes',
    'contratos','compras','medicoes'
  ])
  loop
    execute format(
      'create trigger trg_%I_atualizado_em before update on %I
       for each row execute function fn_set_atualizado_em();', t, t);
  end loop;
end $$;

-- =====================================================================
-- SECTION 5: VERIFICAÇÃO DE VÍNCULOS (trava de exclusão)
-- =====================================================================
create or replace function verificar_vinculos(p_entidade text, p_id uuid)
returns text[] language plpgsql stable as $$
declare
  bloqueios text[] := array[]::text[];
  n int;
begin
  if p_entidade = 'empreendimentos' then
    select count(*) into n from orcamentos where empreendimento_id = p_id;
    if n > 0 then bloqueios := array_append(bloqueios, n || ' orçamento(s)'); end if;
    select count(*) into n from contas_pagar where empreendimento_id = p_id;
    if n > 0 then bloqueios := array_append(bloqueios, n || ' conta(s) a pagar'); end if;
    select count(*) into n from contas_receber where empreendimento_id = p_id;
    if n > 0 then bloqueios := array_append(bloqueios, n || ' conta(s) a receber'); end if;
    select count(*) into n from comissoes where empreendimento_id = p_id;
    if n > 0 then bloqueios := array_append(bloqueios, n || ' comissão/comissões'); end if;
    select count(*) into n from contratos where empreendimento_id = p_id;
    if n > 0 then bloqueios := array_append(bloqueios, n || ' contrato(s)'); end if;
    select count(*) into n from compras where empreendimento_id = p_id;
    if n > 0 then bloqueios := array_append(bloqueios, n || ' compra(s)'); end if;
    select count(*) into n from medicoes where empreendimento_id = p_id;
    if n > 0 then bloqueios := array_append(bloqueios, n || ' medição/medições'); end if;
    select count(*) into n from cronograma
      where empreendimento_id = p_id
        and (coalesce(custo_orcado,0) > 0 or coalesce(percentual_fisico,0) > 0
             or data_inicio_real is not null or data_fim_real is not null);
    if n > 0 then bloqueios := array_append(bloqueios, n || ' etapa(s) com dados no cronograma'); end if;
  elsif p_entidade = 'empresas' then
    select count(*) into n from contas_pagar where empresa_id = p_id;
    if n > 0 then bloqueios := array_append(bloqueios, n || ' conta(s) a pagar'); end if;
    select count(*) into n from orcamentos where empresa_id = p_id;
    if n > 0 then bloqueios := array_append(bloqueios, n || ' orçamento(s)'); end if;
    select count(*) into n from cronograma where responsavel_id = p_id;
    if n > 0 then bloqueios := array_append(bloqueios, n || ' etapa(s) responsável'); end if;
    select count(*) into n from compras where empresa_id = p_id;
    if n > 0 then bloqueios := array_append(bloqueios, n || ' compra(s)'); end if;
    select count(*) into n from medicoes where empresa_id = p_id;
    if n > 0 then bloqueios := array_append(bloqueios, n || ' medição/medições'); end if;
    select count(*) into n from comissoes where beneficiario_id = p_id;
    if n > 0 then bloqueios := array_append(bloqueios, n || ' comissão/comissões'); end if;
    select count(*) into n from contratos where parte_empresa_id = p_id;
    if n > 0 then bloqueios := array_append(bloqueios, n || ' contrato(s)'); end if;
  elsif p_entidade = 'clientes' then
    select count(*) into n from contas_receber where cliente_id = p_id;
    if n > 0 then bloqueios := array_append(bloqueios, n || ' conta(s) a receber'); end if;
    select count(*) into n from comissoes where cliente_id = p_id;
    if n > 0 then bloqueios := array_append(bloqueios, n || ' comissão/comissões'); end if;
    select count(*) into n from contratos where parte_cliente_id = p_id;
    if n > 0 then bloqueios := array_append(bloqueios, n || ' contrato(s)'); end if;
  elsif p_entidade = 'orcamentos' then
    select count(*) into n from compras where orcamento_id = p_id;
    if n > 0 then bloqueios := array_append(bloqueios, n || ' compra(s) gerada(s) deste orçamento'); end if;
  end if;
  return bloqueios;
end;
$$;

-- =====================================================================
-- SECTION 6: RPC marcar_vencedor_orcamento (atomic)
-- =====================================================================
create or replace function marcar_vencedor_orcamento(p_orc_id uuid)
returns uuid language plpgsql as $$
declare
  v_grupo text;
  v_obra uuid;
  v_compra_id uuid;
  v_existe boolean;
begin
  -- Captura grupo e obra
  select grupo_cotacao, empreendimento_id into v_grupo, v_obra
  from orcamentos where id = p_orc_id;
  if v_grupo is null then
    raise exception 'Orçamento % não encontrado ou sem grupo de cotação', p_orc_id;
  end if;

  -- Marca demais como PERDEDOR
  update orcamentos
    set status = 'PERDEDOR'
    where grupo_cotacao = v_grupo
      and empreendimento_id = v_obra
      and id <> p_orc_id;

  -- Marca este como VENCEDOR
  update orcamentos set status = 'VENCEDOR' where id = p_orc_id;

  -- Gera Compra se ainda não existe
  select exists(select 1 from compras where orcamento_id = p_orc_id) into v_existe;
  if not v_existe then
    insert into compras (
      empreendimento_id, etapa, material_servico, descricao_detalhada,
      unidade, quantidade, empresa_id, empresa_nome, valor_total,
      condicao_pagamento, prazo_entrega_dias, prioridade, status,
      data_aprovacao, orcamento_id, observacoes
    )
    select
      o.empreendimento_id, o.etapa, o.material_servico, o.descricao_detalhada,
      o.unidade, o.quantidade, o.empresa_id,
      coalesce(e.nome_fantasia, e.razao_social), o.valor_total,
      o.condicao_pagamento, o.prazo_entrega_dias, 'NORMAL', 'ABERTO',
      current_date, o.id, 'Gerado automaticamente do orçamento vencedor ' || o.id
    from orcamentos o
    left join empresas e on e.id = o.empresa_id
    where o.id = p_orc_id
    returning id into v_compra_id;
  end if;

  return v_compra_id;
end;
$$;

-- =====================================================================
-- SECTION 7: VIEWS DE LEITURA
-- =====================================================================

-- 7.1 v_cronograma_obra (3 custos por etapa + drill-down)
create or replace view v_cronograma_obra as
select
  c.id, c.empreendimento_id, c.etapa, c.marco, c.descricao, c.ordem,
  c.data_inicio_prevista, c.data_fim_prevista, c.data_inicio_real, c.data_fim_real,
  c.custo_orcado, c.percentual_fisico, c.peso, c.status, c.responsavel_id,
  coalesce(
    (select sum(o.valor_total) from orcamentos o
      where o.empreendimento_id = c.empreendimento_id
        and o.etapa = c.etapa and o.status = 'VENCEDOR'), 0
  ) as custo_comprometido,
  coalesce(
    (select sum(p.valor_pago) from contas_pagar p
      where p.empreendimento_id = c.empreendimento_id
        and p.etapa_eap = c.etapa), 0
  ) as custo_pago
from cronograma c;

-- 7.2 v_medicoes_resumo
create or replace view v_medicoes_resumo as
select
  m.empresa_id, m.empreendimento_id, m.descricao, m.etapa,
  e.nome_fantasia, e.razao_social,
  obr.nome as empreendimento_nome,
  max(m.valor_orcado) as valor_orcado,
  sum(case when m.status <> 'CANCELADA' then m.valor_medicao else 0 end) as valor_medido_total,
  sum(case when m.status = 'PAGA' then m.valor_medicao else 0 end) as valor_pago_total,
  count(*) as qtd_medicoes
from medicoes m
join empresas e on e.id = m.empresa_id
join empreendimentos obr on obr.id = m.empreendimento_id
group by m.empresa_id, m.empreendimento_id, m.descricao, m.etapa, e.nome_fantasia, e.razao_social, obr.nome;

-- =====================================================================
-- SECTION 8: RLS POLICIES
-- =====================================================================
-- Habilita RLS em todas as tabelas
alter table profiles          enable row level security;
alter table empresas          enable row level security;
alter table clientes          enable row level security;
alter table empreendimentos   enable row level security;
alter table cronograma        enable row level security;
alter table contas_receber    enable row level security;
alter table contas_pagar      enable row level security;
alter table orcamentos        enable row level security;
alter table comissoes         enable row level security;
alter table contratos         enable row level security;
alter table dda               enable row level security;
alter table compras           enable row level security;
alter table medicoes          enable row level security;
alter table audit_log         enable row level security;

-- Helper: é admin?
create or replace function is_admin() returns boolean
language sql stable security definer as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'ADMIN' and ativo);
$$;

-- Helper: está autenticado e ativo?
create or replace function is_active_user() returns boolean
language sql stable security definer as $$
  select exists(select 1 from profiles where id = auth.uid() and ativo);
$$;

-- Profiles: o próprio usuário lê seu profile; admin lê todos
create policy "self read profile" on profiles for select using (auth.uid() = id or is_admin());
create policy "admin manage profiles" on profiles for all using (is_admin()) with check (is_admin());

-- Padrão para tabelas operacionais: autenticados leem/criam/atualizam; só admin deleta
do $$
declare t text;
begin
  for t in select unnest(array[
    'empresas','clientes','empreendimentos','cronograma',
    'contas_receber','contas_pagar','orcamentos','comissoes',
    'contratos','dda','compras','medicoes'
  ])
  loop
    execute format($p$create policy "auth select" on %I for select using (is_active_user());$p$, t);
    execute format($p$create policy "auth insert" on %I for insert with check (is_active_user());$p$, t);
    execute format($p$create policy "auth update" on %I for update using (is_active_user()) with check (is_active_user());$p$, t);
    execute format($p$create policy "admin delete" on %I for delete using (is_admin());$p$, t);
  end loop;
end $$;

-- audit_log: só admin lê; insert pelo trigger (security definer)
create policy "admin read audit" on audit_log for select using (is_admin());

-- =====================================================================
-- SECTION 9: SEED — usuário admin inicial
-- =====================================================================
-- O admin precisa ser criado via Supabase Auth (signup ou Admin API),
-- com nome no metadata. O trigger fn_handle_new_user cria o profile.
-- Depois, faça:
--
--   update profiles set role = 'ADMIN' where id = '<UUID_DO_ADMIN>';
--
-- =====================================================================
-- FIM
-- =====================================================================

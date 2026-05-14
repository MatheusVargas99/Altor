export type UserRole = 'ADMIN' | 'OPERACIONAL';

export type EmpresaCategoria =
  | 'EMPREITEIRA'
  | 'FORNECEDOR_MATERIAL'
  | 'SERVICO'
  | 'PROJETISTA'
  | 'IMOBILIARIA'
  | 'INSTITUICAO_FINANCEIRA'
  | 'OUTROS';

export type TipoPessoa = 'PF' | 'PJ';
export type ClienteOrigem =
  | 'INDICACAO'
  | 'SITE'
  | 'IMOBILIARIA'
  | 'MARKETING'
  | 'OUTROS';
export type ClienteClassif =
  | 'INVESTIDOR'
  | 'PRIMEIRA_MORADIA'
  | 'UPGRADE'
  | 'OUTROS';

export type EmpreendStatus =
  | 'PLANEJAMENTO'
  | 'EM_OBRA'
  | 'ENTREGUE'
  | 'PAUSADO'
  | 'CANCELADO';

export type EtapaEap =
  | 'M0_PRELIMINARES'
  | 'M0_TERRAPLENAGEM'
  | 'M1_FUNDACAO'
  | 'M2_ESTRUTURA'
  | 'M3_ALVENARIA'
  | 'M3_INSTALACOES_HIDRAULICAS'
  | 'M3_INSTALACOES_ELETRICAS'
  | 'M4_REVESTIMENTO'
  | 'M4_ESQUADRIAS'
  | 'M4_PINTURA'
  | 'M4_LOUCAS_METAIS'
  | 'M5_AREA_COMUM'
  | 'M6_HABITESE'
  | 'M7_ENTREGA';

export type CronogramaStatus =
  | 'NAO_INICIADA'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDA'
  | 'ATRASADA'
  | 'PAUSADA';

export type CrCategoria = 'VENDA_UNIDADE' | 'INVESTIDOR' | 'ALUGUEL' | 'OUTROS';
export type CpCategoria =
  | 'MATERIAL'
  | 'MAO_DE_OBRA'
  | 'EMPREITADA'
  | 'PROJETO'
  | 'LICENCAS_TAXAS'
  | 'MARKETING'
  | 'ADMINISTRATIVO'
  | 'JURIDICO'
  | 'IMPOSTO'
  | 'OUTROS';
export type CrStatus = 'ABERTO' | 'PARCIAL' | 'PAGO' | 'ATRASADO' | 'CANCELADO';
export type CpStatus = CrStatus;
export type CrForma =
  | 'BOLETO'
  | 'PIX'
  | 'TRANSFERENCIA'
  | 'FINANCIAMENTO_CAIXA'
  | 'OUTROS';
export type CpForma = 'BOLETO' | 'PIX' | 'TRANSFERENCIA' | 'CARTAO' | 'DINHEIRO';
export type CpOrigem = 'MANUAL' | 'DDA' | 'IMPORTACAO';

export type OrcamentoUnidade = 'UN' | 'KG' | 'M2' | 'M3' | 'VB' | 'MES' | 'H';
export type OrcamentoStatus =
  | 'PENDENTE'
  | 'VENCEDOR'
  | 'PERDEDOR'
  | 'EM_ANALISE'
  | 'CANCELADO';

export type ComissaoBenef =
  | 'CORRETOR_AUTONOMO'
  | 'IMOBILIARIA'
  | 'FUNCIONARIO_INTERNO'
  | 'INDICADOR';
export type ComissaoGatilho =
  | 'ASSINATURA'
  | 'HABITE_SE'
  | 'ENTREGA_CHAVES'
  | 'PERSONALIZADO';
export type ComissaoStatus =
  | 'PREVISTA'
  | 'A_PAGAR'
  | 'PAGA'
  | 'RETIDA'
  | 'CANCELADA';

export type ContratoTipo =
  | 'COMPRA_VENDA'
  | 'EMPREITADA'
  | 'FORNECIMENTO'
  | 'PRESTACAO_SERVICO'
  | 'INVESTIMENTO'
  | 'LOCACAO'
  | 'OUTROS';
export type ContratoParte = 'CLIENTE' | 'EMPRESA';
export type ContratoStatus =
  | 'EM_ELABORACAO'
  | 'ATIVO'
  | 'DISTRATADO'
  | 'ENCERRADO'
  | 'INADIMPLENTE';

export type CompraPrioridade = 'URGENTE' | 'MODERADA' | 'NORMAL';
export type CompraStatus =
  | 'ABERTO'
  | 'EM_NEGOCIACAO'
  | 'COMPRADO'
  | 'RECEBIDO'
  | 'CANCELADO';

export type MedicaoStatus = 'PREVISTA' | 'MEDIDA' | 'APROVADA' | 'PAGA' | 'CANCELADA';

type Audit = {
  criado_em: string;
  atualizado_em: string;
  criado_por: string | null;
  atualizado_por: string | null;
};

export type Profile = {
  id: string;
  nome: string;
  role: UserRole;
  ativo: boolean;
  ultimo_login: string | null;
  created_at: string;
  updated_at: string;
};

export type Empresa = Audit & {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  categoria: EmpresaCategoria | null;
  email: string | null;
  telefone: string | null;
  contato_responsavel: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  chave_pix: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  observacoes: string | null;
  ativo: boolean;
};

export type Cliente = Audit & {
  id: string;
  nome_completo: string;
  tipo_pessoa: TipoPessoa | null;
  cpf_cnpj: string | null;
  rg: string | null;
  data_nascimento: string | null;
  estado_civil: string | null;
  profissao: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  origem_lead: ClienteOrigem | null;
  classificacao: ClienteClassif | null;
  observacoes: string | null;
  ativo: boolean;
};

export type Empreendimento = Audit & {
  id: string;
  nome: string;
  codigo_curto: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  area_terreno: number | null;
  area_construida: number | null;
  n_unidades: number | null;
  vgv_estimado: number | null;
  custo_total_estimado: number | null;
  data_inicio_prevista: string | null;
  data_entrega_prevista: string | null;
  data_inicio_real: string | null;
  data_entrega_real: string | null;
  status: EmpreendStatus;
  observacoes: string | null;
};

export type Cronograma = Audit & {
  id: string;
  empreendimento_id: string;
  etapa: EtapaEap;
  marco: string;
  descricao: string | null;
  ordem: number;
  data_inicio_prevista: string | null;
  data_fim_prevista: string | null;
  data_inicio_real: string | null;
  data_fim_real: string | null;
  custo_orcado: number;
  custo_realizado: number;
  percentual_fisico: number;
  peso: number;
  status: CronogramaStatus;
  responsavel_id: string | null;
  observacoes: string | null;
};

export type ContaReceber = Audit & {
  id: string;
  empreendimento_id: string | null;
  cliente_id: string | null;
  descricao: string;
  categoria: CrCategoria | null;
  numero_parcela: string | null;
  valor_original: number;
  valor_pago: number;
  valor_aberto: number;
  data_emissao: string | null;
  data_vencimento: string;
  data_pagamento: string | null;
  forma_recebimento: CrForma | null;
  status: CrStatus;
  juros_multa: number;
  observacoes: string | null;
};

export type ContaPagar = Audit & {
  id: string;
  empreendimento_id: string | null;
  empresa_id: string | null;
  descricao: string;
  categoria: CpCategoria | null;
  etapa_eap: EtapaEap | null;
  numero_documento: string | null;
  valor_original: number;
  valor_pago: number;
  valor_aberto: number;
  data_emissao: string | null;
  data_vencimento: string;
  data_pagamento: string | null;
  forma_pagamento: CpForma | null;
  status: CpStatus;
  origem: CpOrigem;
  linha_digitavel: string | null;
  anexo_url: string | null;
  observacoes: string | null;
};

export type Orcamento = Audit & {
  id: string;
  empreendimento_id: string | null;
  etapa: EtapaEap;
  grupo_cotacao: string;
  material_servico: string;
  descricao_detalhada: string | null;
  unidade: OrcamentoUnidade | null;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  empresa_id: string | null;
  prazo_entrega_dias: number | null;
  condicao_pagamento: string | null;
  data_cotacao: string | null;
  validade_proposta: string | null;
  status: OrcamentoStatus;
  observacoes: string | null;
  anexo_url: string | null;
};

export type Comissao = Audit & {
  id: string;
  empreendimento_id: string | null;
  cliente_id: string | null;
  beneficiario_tipo: ComissaoBenef | null;
  beneficiario_id: string | null;
  beneficiario_nome: string;
  valor_venda: number;
  percentual: number;
  valor_comissao_total: number;
  parcela: string | null;
  valor_parcela: number;
  evento_gatilho: ComissaoGatilho | null;
  data_prevista: string | null;
  data_paga: string | null;
  status: ComissaoStatus;
  conta_pagar_id: string | null;
  observacoes: string | null;
};

export type Contrato = Audit & {
  id: string;
  numero: string;
  tipo: ContratoTipo | null;
  empreendimento_id: string | null;
  parte_tipo: ContratoParte | null;
  parte_cliente_id: string | null;
  parte_empresa_id: string | null;
  parte_nome: string;
  objeto: string | null;
  valor_total: number | null;
  forma_pagamento: string | null;
  data_assinatura: string | null;
  data_vigencia_inicio: string | null;
  data_vigencia_fim: string | null;
  status: ContratoStatus;
  arquivo_url: string | null;
  observacoes: string | null;
};

export type Compra = Audit & {
  id: string;
  empreendimento_id: string;
  etapa: EtapaEap | null;
  material_servico: string;
  descricao_detalhada: string | null;
  unidade: OrcamentoUnidade | null;
  quantidade: number;
  empresa_id: string | null;
  empresa_nome: string | null;
  valor_total: number;
  condicao_pagamento: string | null;
  prazo_entrega_dias: number | null;
  prioridade: CompraPrioridade;
  status: CompraStatus;
  data_aprovacao: string | null;
  data_compra: string | null;
  data_recebimento: string | null;
  numero_pedido: string | null;
  orcamento_id: string | null;
  observacoes: string | null;
};

export type Medicao = Audit & {
  id: string;
  empreendimento_id: string;
  empresa_id: string;
  etapa: EtapaEap | null;
  descricao: string;
  valor_orcado: number;
  numero_medicao: string | null;
  valor_medicao: number;
  percentual_medicao: number;
  data_medicao: string | null;
  data_pagamento: string | null;
  status: MedicaoStatus;
  conta_pagar_id: string | null;
  observacoes: string | null;
};

export const EMPRESA_CATEGORIAS: EmpresaCategoria[] = [
  'EMPREITEIRA',
  'FORNECEDOR_MATERIAL',
  'SERVICO',
  'PROJETISTA',
  'IMOBILIARIA',
  'INSTITUICAO_FINANCEIRA',
  'OUTROS',
];

export const EMPREEND_STATUS: EmpreendStatus[] = [
  'PLANEJAMENTO',
  'EM_OBRA',
  'ENTREGUE',
  'PAUSADO',
  'CANCELADO',
];

export const CLIENTE_ORIGENS: ClienteOrigem[] = [
  'INDICACAO',
  'SITE',
  'IMOBILIARIA',
  'MARKETING',
  'OUTROS',
];

export const CLIENTE_CLASSIFS: ClienteClassif[] = [
  'INVESTIDOR',
  'PRIMEIRA_MORADIA',
  'UPGRADE',
  'OUTROS',
];

export const ETAPAS_EAP: EtapaEap[] = [
  'M0_PRELIMINARES',
  'M0_TERRAPLENAGEM',
  'M1_FUNDACAO',
  'M2_ESTRUTURA',
  'M3_ALVENARIA',
  'M3_INSTALACOES_HIDRAULICAS',
  'M3_INSTALACOES_ELETRICAS',
  'M4_REVESTIMENTO',
  'M4_ESQUADRIAS',
  'M4_PINTURA',
  'M4_LOUCAS_METAIS',
  'M5_AREA_COMUM',
  'M6_HABITESE',
  'M7_ENTREGA',
];

export const CR_STATUSES: CrStatus[] = [
  'ABERTO',
  'PARCIAL',
  'PAGO',
  'ATRASADO',
  'CANCELADO',
];

export const CR_CATEGORIAS: CrCategoria[] = [
  'VENDA_UNIDADE',
  'INVESTIDOR',
  'ALUGUEL',
  'OUTROS',
];

export const CP_CATEGORIAS: CpCategoria[] = [
  'MATERIAL',
  'MAO_DE_OBRA',
  'EMPREITADA',
  'PROJETO',
  'LICENCAS_TAXAS',
  'MARKETING',
  'ADMINISTRATIVO',
  'JURIDICO',
  'IMPOSTO',
  'OUTROS',
];

export const CR_FORMAS: CrForma[] = [
  'BOLETO',
  'PIX',
  'TRANSFERENCIA',
  'FINANCIAMENTO_CAIXA',
  'OUTROS',
];

export const CP_FORMAS: CpForma[] = [
  'BOLETO',
  'PIX',
  'TRANSFERENCIA',
  'CARTAO',
  'DINHEIRO',
];

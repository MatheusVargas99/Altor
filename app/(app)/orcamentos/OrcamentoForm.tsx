'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { orcamentoSchema, type OrcamentoInput } from '@/lib/schemas/orcamento';
import { createOrcamento, updateOrcamento } from '@/lib/actions/orcamentos';
import {
  ETAPAS_EAP,
  type Empreendimento,
  type Empresa,
  type Orcamento,
} from '@/types/db';

const etapaOpts = ETAPAS_EAP.map((e) => ({ value: e, label: e.replaceAll('_', ' ') }));
const unidadeOpts = ['UN', 'KG', 'M2', 'M3', 'VB', 'MES', 'H'].map((u) => ({
  value: u,
  label: u,
}));
const statusOpts = [
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'EM_ANALISE', label: 'Em análise' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export function OrcamentoForm({
  orcamento,
  empreendimentos,
  empresas,
  onDone,
  onError,
  onCancel,
}: {
  orcamento: Orcamento | null;
  empreendimentos: Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[];
  empresas: Pick<Empresa, 'id' | 'razao_social' | 'nome_fantasia'>[];
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrcamentoInput>({
    resolver: zodResolver(orcamentoSchema) as never,
    defaultValues: orcamento ?? { status: 'PENDENTE', quantidade: 1, valor_unitario: 0 },
  });

  const onSubmit = (data: OrcamentoInput) => {
    startTransition(async () => {
      const res = orcamento
        ? await updateOrcamento(orcamento.id, data)
        : await createOrcamento(data);
      if (!res.ok) return onError(res.error);
      onDone(orcamento ? 'Orçamento atualizado.' : 'Orçamento criado.');
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Empreendimento">
          <Select
            {...register('empreendimento_id')}
            options={empreendimentos.map((e) => ({ value: e.id, label: e.nome }))}
            placeholder="Selecione…"
          />
        </Field>
        <Field label="Etapa *" error={errors.etapa?.message}>
          <Select {...register('etapa')} options={etapaOpts} placeholder="Selecione…" />
        </Field>

        <Field
          label="Grupo de cotação *"
          hint="Agrupa propostas comparáveis"
          error={errors.grupo_cotacao?.message}
        >
          <Input {...register('grupo_cotacao')} />
        </Field>
        <Field label="Material/serviço *" error={errors.material_servico?.message}>
          <Input {...register('material_servico')} />
        </Field>

        <Field label="Empresa (fornecedor)">
          <Select
            {...register('empresa_id')}
            options={empresas.map((e) => ({
              value: e.id,
              label: e.nome_fantasia ?? e.razao_social,
            }))}
            placeholder="Selecione…"
          />
        </Field>
        <Field label="Status">
          <Select
            {...register('status')}
            options={
              orcamento
                ? [
                    ...statusOpts,
                    { value: 'VENCEDOR', label: 'Vencedor' },
                    { value: 'PERDEDOR', label: 'Perdedor' },
                  ]
                : statusOpts
            }
          />
        </Field>

        <Field label="Quantidade">
          <Input type="number" step="0.0001" {...register('quantidade')} />
        </Field>
        <Field label="Unidade">
          <Select {...register('unidade')} options={unidadeOpts} placeholder="—" />
        </Field>

        <Field label="Valor unitário (R$)">
          <Input type="number" step="0.01" {...register('valor_unitario')} />
        </Field>
        <Field label="Prazo entrega (dias)">
          <Input type="number" {...register('prazo_entrega_dias')} />
        </Field>

        <Field label="Condição de pagamento">
          <Input {...register('condicao_pagamento')} />
        </Field>
        <Field label="Anexo (URL)">
          <Input {...register('anexo_url')} />
        </Field>

        <Field label="Data cotação">
          <Input type="date" {...register('data_cotacao')} />
        </Field>
        <Field label="Validade proposta">
          <Input type="date" {...register('validade_proposta')} />
        </Field>
      </div>

      <Field label="Descrição detalhada">
        <Textarea rows={2} {...register('descricao_detalhada')} />
      </Field>
      <Field label="Observações">
        <Textarea rows={2} {...register('observacoes')} />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Salvando…' : orcamento ? 'Salvar' : 'Criar orçamento'}
        </button>
      </div>
    </form>
  );
}

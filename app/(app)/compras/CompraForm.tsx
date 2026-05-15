'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { compraSchema, type CompraInput } from '@/lib/schemas/compra';
import { createCompra, updateCompra } from '@/lib/actions/compras';
import {
  ETAPAS_EAP,
  type Compra,
  type Empreendimento,
  type Empresa,
} from '@/types/db';

const etapaOpts = ETAPAS_EAP.map((e) => ({ value: e, label: e.replaceAll('_', ' ') }));
const unidadeOpts = ['UN', 'KG', 'M2', 'M3', 'VB', 'MES', 'H'].map((u) => ({
  value: u,
  label: u,
}));
const prioOpts = [
  { value: 'URGENTE', label: 'Urgente' },
  { value: 'MODERADA', label: 'Moderada' },
  { value: 'NORMAL', label: 'Normal' },
];
const statusOpts = [
  { value: 'ABERTO', label: 'Aberto' },
  { value: 'EM_NEGOCIACAO', label: 'Em negociação' },
  { value: 'COMPRADO', label: 'Comprado' },
  { value: 'RECEBIDO', label: 'Recebido' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export function CompraForm({
  compra,
  empreendimentos,
  empresas,
  onDone,
  onError,
  onCancel,
}: {
  compra: Compra | null;
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
  } = useForm<CompraInput>({
    resolver: zodResolver(compraSchema) as never,
    defaultValues:
      compra ??
      ({
        prioridade: 'NORMAL',
        status: 'ABERTO',
        data_aprovacao: new Date().toISOString().slice(0, 10),
        quantidade: 1,
        valor_total: 0,
      } as CompraInput),
  });

  const onSubmit = (data: CompraInput) => {
    startTransition(async () => {
      const res = compra
        ? await updateCompra(compra.id, data)
        : await createCompra(data);
      if (!res.ok) return onError(res.error);
      onDone(compra ? 'Compra atualizada.' : 'Compra criada.');
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Empreendimento *" error={errors.empreendimento_id?.message}>
          <Select
            {...register('empreendimento_id')}
            options={empreendimentos.map((e) => ({ value: e.id, label: e.nome }))}
            placeholder="Selecione…"
          />
        </Field>
        <Field label="Etapa">
          <Select {...register('etapa')} options={etapaOpts} placeholder="—" />
        </Field>

        <Field label="Material/serviço *" error={errors.material_servico?.message}>
          <Input {...register('material_servico')} />
        </Field>
        <Field label="Nº pedido">
          <Input {...register('numero_pedido')} />
        </Field>

        <Field label="Fornecedor (empresa)">
          <Select
            {...register('empresa_id')}
            options={empresas.map((e) => ({
              value: e.id,
              label: e.nome_fantasia ?? e.razao_social,
            }))}
            placeholder="Selecione…"
          />
        </Field>
        <Field label="Fornecedor (texto livre)" hint="Use se não cadastrado">
          <Input {...register('empresa_nome')} />
        </Field>

        <Field label="Quantidade">
          <Input type="number" step="0.0001" {...register('quantidade')} />
        </Field>
        <Field label="Unidade">
          <Select {...register('unidade')} options={unidadeOpts} placeholder="—" />
        </Field>

        <Field label="Valor total (R$)">
          <Input type="number" step="0.01" {...register('valor_total')} />
        </Field>
        <Field label="Prazo entrega (dias)">
          <Input type="number" {...register('prazo_entrega_dias')} />
        </Field>

        <Field label="Condição de pagamento">
          <Input {...register('condicao_pagamento')} />
        </Field>
        <Field label="Prioridade">
          <Select {...register('prioridade')} options={prioOpts} />
        </Field>

        <Field label="Status">
          <Select {...register('status')} options={statusOpts} />
        </Field>

        <Field label="Data aprovação">
          <Input type="date" {...register('data_aprovacao')} />
        </Field>
        <Field label="Data compra">
          <Input type="date" {...register('data_compra')} />
        </Field>
        <Field label="Data recebimento">
          <Input type="date" {...register('data_recebimento')} />
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
          {isPending ? 'Salvando…' : compra ? 'Salvar' : 'Criar compra'}
        </button>
      </div>
    </form>
  );
}

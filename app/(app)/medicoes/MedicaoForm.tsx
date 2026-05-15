'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { medicaoSchema, type MedicaoInput } from '@/lib/schemas/medicao';
import { createMedicao, updateMedicao } from '@/lib/actions/medicoes';
import {
  ETAPAS_EAP,
  type Empreendimento,
  type Empresa,
  type Medicao,
} from '@/types/db';

const etapaOpts = ETAPAS_EAP.map((e) => ({ value: e, label: e.replaceAll('_', ' ') }));
const statusOpts = [
  { value: 'PREVISTA', label: 'Prevista' },
  { value: 'MEDIDA', label: 'Medida' },
  { value: 'APROVADA', label: 'Aprovada' },
  { value: 'PAGA', label: 'Paga' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

export function MedicaoForm({
  medicao,
  empreendimentos,
  empresas,
  onDone,
  onError,
  onCancel,
}: {
  medicao: Medicao | null;
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
  } = useForm<MedicaoInput>({
    resolver: zodResolver(medicaoSchema) as never,
    defaultValues: medicao ?? ({ status: 'PREVISTA', percentual_medicao: 0 } as MedicaoInput),
  });

  const onSubmit = (data: MedicaoInput) => {
    startTransition(async () => {
      const res = medicao
        ? await updateMedicao(medicao.id, data)
        : await createMedicao(data);
      if (!res.ok) return onError(res.error);
      onDone(medicao ? 'Medição atualizada.' : 'Medição criada.');
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
        <Field label="Empresa *" error={errors.empresa_id?.message}>
          <Select
            {...register('empresa_id')}
            options={empresas.map((e) => ({
              value: e.id,
              label: e.nome_fantasia ?? e.razao_social,
            }))}
            placeholder="Selecione…"
          />
        </Field>

        <Field label="Etapa">
          <Select {...register('etapa')} options={etapaOpts} placeholder="—" />
        </Field>
        <Field label="Nº medição">
          <Input {...register('numero_medicao')} />
        </Field>

        <Field label="Descrição *" error={errors.descricao?.message}>
          <Input {...register('descricao')} />
        </Field>
        <Field label="Status">
          <Select {...register('status')} options={statusOpts} />
        </Field>

        <Field label="Valor orçado (R$) *" error={errors.valor_orcado?.message}>
          <Input type="number" step="0.01" {...register('valor_orcado')} />
        </Field>
        <Field label="Valor medição (R$) *" error={errors.valor_medicao?.message}>
          <Input type="number" step="0.01" {...register('valor_medicao')} />
        </Field>

        <Field label="% Medição">
          <Input type="number" step="0.01" max={100} {...register('percentual_medicao')} />
        </Field>
        <Field label="Data medição">
          <Input type="date" {...register('data_medicao')} />
        </Field>

        <Field label="Data pagamento">
          <Input type="date" {...register('data_pagamento')} />
        </Field>
      </div>

      <Field label="Observações">
        <Textarea rows={2} {...register('observacoes')} />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Salvando…' : medicao ? 'Salvar' : 'Criar medição'}
        </button>
      </div>
    </form>
  );
}

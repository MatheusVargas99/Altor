'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import {
  empreendimentoSchema,
  type EmpreendimentoInput,
} from '@/lib/schemas/empreendimento';
import {
  createEmpreendimento,
  updateEmpreendimento,
} from '@/lib/actions/empreendimentos';
import { EMPREEND_STATUS, type Empreendimento } from '@/types/db';

const statusOptions = EMPREEND_STATUS.map((s) => ({
  value: s,
  label: s.replaceAll('_', ' '),
}));

export function EmpreendimentoForm({
  empreendimento,
  onDone,
  onError,
  onCancel,
}: {
  empreendimento: Empreendimento | null;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmpreendimentoInput>({
    resolver: zodResolver(empreendimentoSchema) as never,
    defaultValues: empreendimento
      ? {
          nome: empreendimento.nome,
          codigo_curto: empreendimento.codigo_curto,
          endereco: empreendimento.endereco,
          cidade: empreendimento.cidade,
          uf: empreendimento.uf,
          area_terreno: empreendimento.area_terreno,
          area_construida: empreendimento.area_construida,
          n_unidades: empreendimento.n_unidades,
          vgv_estimado: empreendimento.vgv_estimado,
          custo_total_estimado: empreendimento.custo_total_estimado,
          data_inicio_prevista: empreendimento.data_inicio_prevista,
          data_entrega_prevista: empreendimento.data_entrega_prevista,
          data_inicio_real: empreendimento.data_inicio_real,
          data_entrega_real: empreendimento.data_entrega_real,
          status: empreendimento.status,
          observacoes: empreendimento.observacoes,
        }
      : { status: 'PLANEJAMENTO' },
  });

  const onSubmit = (data: EmpreendimentoInput) => {
    startTransition(async () => {
      const res = empreendimento
        ? await updateEmpreendimento(empreendimento.id, data)
        : await createEmpreendimento(data);
      if (!res.ok) {
        onError(res.error);
        return;
      }
      onDone(
        empreendimento ? 'Empreendimento atualizado.' : 'Empreendimento criado (EAP criada).',
      );
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nome *" error={errors.nome?.message}>
          <Input {...register('nome')} />
        </Field>
        <Field label="Código curto" hint="ex.: SAV" error={errors.codigo_curto?.message}>
          <Input {...register('codigo_curto')} />
        </Field>

        <Field label="Endereço">
          <Input {...register('endereco')} />
        </Field>
        <Field label="Cidade">
          <Input {...register('cidade')} />
        </Field>

        <Field label="UF" hint="2 letras">
          <Input maxLength={2} {...register('uf')} />
        </Field>
        <Field label="Status">
          <Select {...register('status')} options={statusOptions} />
        </Field>

        <Field label="Área terreno (m²)">
          <Input type="number" step="0.01" {...register('area_terreno')} />
        </Field>
        <Field label="Área construída (m²)">
          <Input type="number" step="0.01" {...register('area_construida')} />
        </Field>

        <Field label="Nº unidades">
          <Input type="number" {...register('n_unidades')} />
        </Field>
        <Field label="VGV estimado (R$)">
          <Input type="number" step="0.01" {...register('vgv_estimado')} />
        </Field>

        <div className="md:col-span-2">
          <Field label="Custo total estimado (R$)">
            <Input type="number" step="0.01" {...register('custo_total_estimado')} />
          </Field>
        </div>

        <Field label="Início previsto">
          <Input type="date" {...register('data_inicio_prevista')} />
        </Field>
        <Field label="Entrega prevista">
          <Input type="date" {...register('data_entrega_prevista')} />
        </Field>

        <Field label="Início real">
          <Input type="date" {...register('data_inicio_real')} />
        </Field>
        <Field label="Entrega real">
          <Input type="date" {...register('data_entrega_real')} />
        </Field>
      </div>

      <Field label="Observações">
        <Textarea rows={3} {...register('observacoes')} />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending
            ? 'Salvando…'
            : empreendimento
              ? 'Salvar alterações'
              : 'Criar empreendimento'}
        </button>
      </div>
    </form>
  );
}

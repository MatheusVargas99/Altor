'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import {
  contaReceberSchema,
  parcelamentoSchema,
  type ContaReceberInput,
  type ParcelamentoInput,
} from '@/lib/schemas/contas';
import {
  createContaReceber,
  criarContasReceberParceladas,
  updateContaReceber,
} from '@/lib/actions/contas-receber';
import { PERIODICIDADES } from '@/lib/parcelamento';
import { CR_CATEGORIAS, CR_FORMAS, CR_STATUSES, type Cliente, type ContaReceber, type Empreendimento } from '@/types/db';

const catOpts = CR_CATEGORIAS.map((c) => ({ value: c, label: c.replaceAll('_', ' ') }));
const formaOpts = CR_FORMAS.map((c) => ({ value: c, label: c.replaceAll('_', ' ') }));
const statusOpts = CR_STATUSES.map((c) => ({ value: c, label: c }));
const periodOpts = PERIODICIDADES.map((c) => ({ value: c, label: c }));

export function CRForm({
  conta,
  empreendimentos,
  clientes,
  onDone,
  onError,
  onCancel,
}: {
  conta: ContaReceber | null;
  empreendimentos: Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[];
  clientes: Pick<Cliente, 'id' | 'nome_completo'>[];
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [parcelar, setParcelar] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContaReceberInput>({
    resolver: zodResolver(contaReceberSchema) as never,
    defaultValues: conta
      ? {
          empreendimento_id: conta.empreendimento_id,
          cliente_id: conta.cliente_id,
          descricao: conta.descricao,
          categoria: conta.categoria,
          numero_parcela: conta.numero_parcela,
          valor_original: conta.valor_original,
          valor_pago: conta.valor_pago,
          data_emissao: conta.data_emissao,
          data_vencimento: conta.data_vencimento,
          data_pagamento: conta.data_pagamento,
          forma_recebimento: conta.forma_recebimento,
          status: conta.status,
          juros_multa: conta.juros_multa,
          observacoes: conta.observacoes,
        }
      : { status: 'ABERTO', valor_pago: 0, juros_multa: 0 },
  });

  const {
    register: regParc,
    handleSubmit: handleSubParc,
    formState: { errors: errsParc },
  } = useForm<ParcelamentoInput>({
    resolver: zodResolver(parcelamentoSchema) as never,
    defaultValues: { qtd_parcelas: 12, periodicidade: 'MENSAL' },
  });

  const onSubmit = (data: ContaReceberInput) => {
    startTransition(async () => {
      const res = conta
        ? await updateContaReceber(conta.id, data)
        : await createContaReceber(data);
      if (!res.ok) return onError(res.error);
      onDone(conta ? 'Conta atualizada.' : 'Conta criada.');
    });
  };

  const onSubmitParcelas = async (base: ContaReceberInput, parc: ParcelamentoInput) => {
    startTransition(async () => {
      const res = await criarContasReceberParceladas(base, parc);
      if (!res.ok) return onError(res.error);
      onDone(`${res.data?.count} parcelas criadas.`);
    });
  };

  return (
    <form
      onSubmit={handleSubmit((base) => {
        if (!parcelar) return onSubmit(base);
        return handleSubParc((parc) => onSubmitParcelas(base, parc))();
      })}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Descrição *" error={errors.descricao?.message}>
          <Input {...register('descricao')} />
        </Field>
        <Field label="Categoria">
          <Select {...register('categoria')} options={catOpts} placeholder="Selecione…" />
        </Field>

        <Field label="Empreendimento">
          <Select
            {...register('empreendimento_id')}
            options={empreendimentos.map((e) => ({ value: e.id, label: e.nome }))}
            placeholder="Selecione…"
          />
        </Field>
        <Field label="Cliente">
          <Select
            {...register('cliente_id')}
            options={clientes.map((c) => ({ value: c.id, label: c.nome_completo }))}
            placeholder="Selecione…"
          />
        </Field>

        <Field label="Valor (R$) *" error={errors.valor_original?.message}>
          <Input type="number" step="0.01" {...register('valor_original')} />
        </Field>
        <Field label="Valor pago" error={errors.valor_pago?.message}>
          <Input type="number" step="0.01" {...register('valor_pago')} />
        </Field>

        <Field label="Data emissão">
          <Input type="date" {...register('data_emissao')} />
        </Field>
        <Field label="Data vencimento *" error={errors.data_vencimento?.message}>
          <Input type="date" {...register('data_vencimento')} />
        </Field>

        <Field label="Data pagamento">
          <Input type="date" {...register('data_pagamento')} />
        </Field>
        <Field label="Forma de recebimento">
          <Select {...register('forma_recebimento')} options={formaOpts} placeholder="—" />
        </Field>

        <Field label="Nº parcela" hint="ex.: 3/12">
          <Input {...register('numero_parcela')} />
        </Field>
        <Field label="Status">
          <Select {...register('status')} options={statusOpts} />
        </Field>

        <Field label="Juros / multa">
          <Input type="number" step="0.01" {...register('juros_multa')} />
        </Field>
      </div>

      <Field label="Observações">
        <Textarea rows={2} {...register('observacoes')} />
      </Field>

      {!conta && (
        <div className="border-t border-border pt-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={parcelar}
              onChange={(e) => setParcelar(e.target.checked)}
            />
            Criar parcelado (gera N contas)
          </label>
          {parcelar && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <Field
                label="Qtd parcelas (2–240)"
                error={errsParc.qtd_parcelas?.message}
              >
                <Input type="number" min={2} max={240} {...regParc('qtd_parcelas')} />
              </Field>
              <Field label="Periodicidade" error={errsParc.periodicidade?.message}>
                <Select {...regParc('periodicidade')} options={periodOpts} />
              </Field>
              <Field
                label="1º vencimento"
                error={errsParc.primeiro_vencimento?.message}
              >
                <Input type="date" {...regParc('primeiro_vencimento')} />
              </Field>
              <p className="md:col-span-3 text-xs text-text-dim">
                O valor acima será dividido em N parcelas. A última recebe o ajuste de centavos.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending
            ? 'Salvando…'
            : parcelar
              ? 'Criar parcelas'
              : conta
                ? 'Salvar'
                : 'Criar conta'}
        </button>
      </div>
    </form>
  );
}

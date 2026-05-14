'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import {
  contaPagarSchema,
  parcelamentoSchema,
  type ContaPagarInput,
  type ParcelamentoInput,
} from '@/lib/schemas/contas';
import {
  createContaPagar,
  criarContasPagarParceladas,
  updateContaPagar,
} from '@/lib/actions/contas-pagar';
import { PERIODICIDADES } from '@/lib/parcelamento';
import {
  CP_CATEGORIAS,
  CP_FORMAS,
  CR_STATUSES,
  ETAPAS_EAP,
  type ContaPagar,
  type Empreendimento,
  type Empresa,
} from '@/types/db';

const catOpts = CP_CATEGORIAS.map((c) => ({ value: c, label: c.replaceAll('_', ' ') }));
const formaOpts = CP_FORMAS.map((c) => ({ value: c, label: c.replaceAll('_', ' ') }));
const statusOpts = CR_STATUSES.map((c) => ({ value: c, label: c }));
const etapaOpts = ETAPAS_EAP.map((c) => ({ value: c, label: c.replaceAll('_', ' ') }));
const periodOpts = PERIODICIDADES.map((c) => ({ value: c, label: c }));

export function CPForm({
  conta,
  empreendimentos,
  empresas,
  onDone,
  onError,
  onCancel,
}: {
  conta: ContaPagar | null;
  empreendimentos: Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[];
  empresas: Pick<Empresa, 'id' | 'razao_social' | 'nome_fantasia'>[];
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
  } = useForm<ContaPagarInput>({
    resolver: zodResolver(contaPagarSchema) as never,
    defaultValues: conta
      ? {
          empreendimento_id: conta.empreendimento_id,
          empresa_id: conta.empresa_id,
          descricao: conta.descricao,
          categoria: conta.categoria,
          etapa_eap: conta.etapa_eap,
          numero_documento: conta.numero_documento,
          valor_original: conta.valor_original,
          valor_pago: conta.valor_pago,
          data_emissao: conta.data_emissao,
          data_vencimento: conta.data_vencimento,
          data_pagamento: conta.data_pagamento,
          forma_pagamento: conta.forma_pagamento,
          status: conta.status,
          linha_digitavel: conta.linha_digitavel,
          anexo_url: conta.anexo_url,
          observacoes: conta.observacoes,
        }
      : { status: 'ABERTO', valor_pago: 0 },
  });

  const {
    register: regParc,
    handleSubmit: handleSubParc,
    formState: { errors: errsParc },
  } = useForm<ParcelamentoInput>({
    resolver: zodResolver(parcelamentoSchema) as never,
    defaultValues: { qtd_parcelas: 12, periodicidade: 'MENSAL' },
  });

  const onSubmit = (data: ContaPagarInput) => {
    startTransition(async () => {
      const res = conta
        ? await updateContaPagar(conta.id, data)
        : await createContaPagar(data);
      if (!res.ok) return onError(res.error);
      onDone(conta ? 'Conta atualizada.' : 'Conta criada.');
    });
  };

  const onSubmitParcelas = (base: ContaPagarInput, parc: ParcelamentoInput) => {
    startTransition(async () => {
      const res = await criarContasPagarParceladas(base, parc);
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
        <Field label="Fornecedor / empresa">
          <Select
            {...register('empresa_id')}
            options={empresas.map((e) => ({
              value: e.id,
              label: e.nome_fantasia ?? e.razao_social,
            }))}
            placeholder="Selecione…"
          />
        </Field>

        <Field label="Etapa EAP">
          <Select {...register('etapa_eap')} options={etapaOpts} placeholder="—" />
        </Field>
        <Field label="Nº documento">
          <Input {...register('numero_documento')} />
        </Field>

        <Field label="Valor (R$) *" error={errors.valor_original?.message}>
          <Input type="number" step="0.01" {...register('valor_original')} />
        </Field>
        <Field label="Valor pago">
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
        <Field label="Forma de pagamento">
          <Select {...register('forma_pagamento')} options={formaOpts} placeholder="—" />
        </Field>

        <Field label="Linha digitável">
          <Input {...register('linha_digitavel')} />
        </Field>
        <Field label="Status">
          <Select {...register('status')} options={statusOpts} />
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
            Criar parcelado
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
              <Field label="1º vencimento" error={errsParc.primeiro_vencimento?.message}>
                <Input type="date" {...regParc('primeiro_vencimento')} />
              </Field>
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

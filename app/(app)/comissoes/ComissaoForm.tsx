'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import {
  comissaoSchema,
  parcelamentoComissaoSchema,
  type ComissaoInput,
  type ParcelamentoComissaoInput,
} from '@/lib/schemas/comissao';
import {
  createComissao,
  criarComissoesParceladas,
  updateComissao,
} from '@/lib/actions/comissoes';
import { PERIODICIDADES } from '@/lib/parcelamento';
import type {
  Cliente,
  Comissao,
  ComissaoBenef,
  ComissaoGatilho,
  ComissaoStatus,
  Empreendimento,
  Empresa,
} from '@/types/db';

const BENEF_OPTS: ComissaoBenef[] = [
  'CORRETOR_AUTONOMO',
  'IMOBILIARIA',
  'FUNCIONARIO_INTERNO',
  'INDICADOR',
];
const GATILHO_OPTS: ComissaoGatilho[] = [
  'ASSINATURA',
  'HABITE_SE',
  'ENTREGA_CHAVES',
  'PERSONALIZADO',
];
const STATUS_OPTS: ComissaoStatus[] = [
  'PREVISTA',
  'A_PAGAR',
  'PAGA',
  'RETIDA',
  'CANCELADA',
];

const benefOpts = BENEF_OPTS.map((c) => ({
  value: c,
  label: c.replaceAll('_', ' '),
}));
const gatilhoOpts = GATILHO_OPTS.map((c) => ({
  value: c,
  label: c.replaceAll('_', ' '),
}));
const statusOpts = STATUS_OPTS.map((c) => ({ value: c, label: c }));
const periodOpts = PERIODICIDADES.map((c) => ({ value: c, label: c }));

export function ComissaoForm({
  comissao,
  empreendimentos,
  clientes,
  empresas,
  onDone,
  onError,
  onCancel,
}: {
  comissao: Comissao | null;
  empreendimentos: Pick<Empreendimento, 'id' | 'nome'>[];
  clientes: Pick<Cliente, 'id' | 'nome_completo'>[];
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
  } = useForm<ComissaoInput>({
    resolver: zodResolver(comissaoSchema) as never,
    defaultValues: comissao
      ? {
          empreendimento_id: comissao.empreendimento_id,
          cliente_id: comissao.cliente_id,
          beneficiario_tipo: comissao.beneficiario_tipo,
          beneficiario_id: comissao.beneficiario_id,
          beneficiario_nome: comissao.beneficiario_nome,
          valor_venda: comissao.valor_venda,
          percentual: comissao.percentual,
          parcela: comissao.parcela,
          valor_parcela: comissao.valor_parcela,
          evento_gatilho: comissao.evento_gatilho,
          data_prevista: comissao.data_prevista,
          data_paga: comissao.data_paga,
          status: comissao.status,
          observacoes: comissao.observacoes,
        }
      : { status: 'PREVISTA', percentual: 0, valor_venda: 0 },
  });

  const {
    register: regParc,
    handleSubmit: handleSubParc,
    formState: { errors: errsParc },
  } = useForm<ParcelamentoComissaoInput>({
    resolver: zodResolver(parcelamentoComissaoSchema) as never,
    defaultValues: { qtd_parcelas: 12, periodicidade: 'MENSAL' },
  });

  const onSubmit = (data: ComissaoInput) => {
    startTransition(async () => {
      const res = comissao
        ? await updateComissao(comissao.id, data)
        : await createComissao(data);
      if (!res.ok) return onError(res.error);
      onDone(comissao ? 'Comissão atualizada.' : 'Comissão criada.');
    });
  };

  const onSubmitParcelas = async (
    base: ComissaoInput,
    parc: ParcelamentoComissaoInput,
  ) => {
    startTransition(async () => {
      const res = await criarComissoesParceladas(base, parc);
      if (!res.ok) return onError(res.error);
      onDone(`${res.data?.count} parcelas criadas.`);
    });
  };

  const empresaLabel = (e: Pick<Empresa, 'id' | 'razao_social' | 'nome_fantasia'>) =>
    e.nome_fantasia ? `${e.nome_fantasia} (${e.razao_social})` : e.razao_social;

  return (
    <form
      onSubmit={handleSubmit((base) => {
        if (!parcelar) return onSubmit(base);
        return handleSubParc((parc) => onSubmitParcelas(base, parc))();
      })}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Beneficiário (nome) *" error={errors.beneficiario_nome?.message}>
          <Input {...register('beneficiario_nome')} />
        </Field>
        <Field label="Tipo de beneficiário">
          <Select
            {...register('beneficiario_tipo')}
            options={benefOpts}
            placeholder="Selecione…"
          />
        </Field>

        <Field label="Empresa beneficiária">
          <Select
            {...register('beneficiario_id')}
            options={empresas.map((e) => ({ value: e.id, label: empresaLabel(e) }))}
            placeholder="Selecione…"
          />
        </Field>
        <Field label="Evento gatilho">
          <Select
            {...register('evento_gatilho')}
            options={gatilhoOpts}
            placeholder="Selecione…"
          />
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

        <Field label="Valor da venda (R$) *" error={errors.valor_venda?.message}>
          <Input type="number" step="0.01" {...register('valor_venda')} />
        </Field>
        <Field label="Percentual (%)" error={errors.percentual?.message}>
          <Input type="number" step="0.001" {...register('percentual')} />
        </Field>

        <Field label="Valor da parcela (R$) *" error={errors.valor_parcela?.message}>
          <Input type="number" step="0.01" {...register('valor_parcela')} />
        </Field>
        <Field label="Parcela" hint="ex.: 3/12">
          <Input {...register('parcela')} />
        </Field>

        <Field label="Data prevista">
          <Input type="date" {...register('data_prevista')} />
        </Field>
        <Field label="Data paga">
          <Input type="date" {...register('data_paga')} />
        </Field>

        <Field label="Status">
          <Select {...register('status')} options={statusOpts} />
        </Field>
      </div>

      <Field label="Observações">
        <Textarea rows={2} {...register('observacoes')} />
      </Field>

      {!comissao && (
        <div className="border-t border-border pt-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={parcelar}
              onChange={(e) => setParcelar(e.target.checked)}
            />
            Criar parcelado (gera N comissões)
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
                O valor da parcela acima será dividido em N comissões. A última recebe o ajuste de centavos.
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
              : comissao
                ? 'Salvar'
                : 'Criar comissão'}
        </button>
      </div>
    </form>
  );
}

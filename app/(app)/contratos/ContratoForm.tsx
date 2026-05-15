'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { contratoSchema, type ContratoInput } from '@/lib/schemas/contrato';
import { createContrato, updateContrato } from '@/lib/actions/contratos';
import type { Cliente, Contrato, Empreendimento, Empresa } from '@/types/db';

const tipoOpts = [
  { value: 'COMPRA_VENDA', label: 'Compra e venda' },
  { value: 'EMPREITADA', label: 'Empreitada' },
  { value: 'FORNECIMENTO', label: 'Fornecimento' },
  { value: 'PRESTACAO_SERVICO', label: 'Prestação de serviço' },
  { value: 'INVESTIMENTO', label: 'Investimento' },
  { value: 'LOCACAO', label: 'Locação' },
  { value: 'OUTROS', label: 'Outros' },
];

const statusOpts = [
  { value: 'EM_ELABORACAO', label: 'Em elaboração' },
  { value: 'ATIVO', label: 'Ativo' },
  { value: 'DISTRATADO', label: 'Distratado' },
  { value: 'ENCERRADO', label: 'Encerrado' },
  { value: 'INADIMPLENTE', label: 'Inadimplente' },
];

export function ContratoForm({
  contrato,
  empreendimentos,
  clientes,
  empresas,
  onDone,
  onError,
  onCancel,
}: {
  contrato: Contrato | null;
  empreendimentos: Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[];
  clientes: Pick<Cliente, 'id' | 'nome_completo'>[];
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
  } = useForm<ContratoInput>({
    resolver: zodResolver(contratoSchema) as never,
    defaultValues: contrato ?? ({ status: 'EM_ELABORACAO' } as ContratoInput),
  });

  const onSubmit = (data: ContratoInput) => {
    startTransition(async () => {
      const res = contrato
        ? await updateContrato(contrato.id, data)
        : await createContrato(data);
      if (!res.ok) return onError(res.error);
      onDone(contrato ? 'Contrato atualizado.' : 'Contrato criado.');
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nº contrato *" error={errors.numero?.message}>
          <Input {...register('numero')} />
        </Field>
        <Field label="Tipo">
          <Select {...register('tipo')} options={tipoOpts} placeholder="Selecione…" />
        </Field>

        <Field label="Empreendimento">
          <Select
            {...register('empreendimento_id')}
            options={empreendimentos.map((e) => ({ value: e.id, label: e.nome }))}
            placeholder="Selecione…"
          />
        </Field>
        <Field label="Status">
          <Select {...register('status')} options={statusOpts} />
        </Field>

        <Field label="Parte cliente">
          <Select
            {...register('parte_cliente_id')}
            options={clientes.map((c) => ({ value: c.id, label: c.nome_completo }))}
            placeholder="—"
          />
        </Field>
        <Field label="Parte empresa">
          <Select
            {...register('parte_empresa_id')}
            options={empresas.map((e) => ({
              value: e.id,
              label: e.nome_fantasia ?? e.razao_social,
            }))}
            placeholder="—"
          />
        </Field>

        <Field
          label="Nome da parte (texto) *"
          hint="Necessário sempre"
          error={errors.parte_nome?.message}
        >
          <Input {...register('parte_nome')} />
        </Field>
        <Field label="Tipo de parte">
          <Select
            {...register('parte_tipo')}
            options={[
              { value: 'CLIENTE', label: 'Cliente' },
              { value: 'EMPRESA', label: 'Empresa' },
            ]}
            placeholder="—"
          />
        </Field>

        <Field label="Valor total (R$)">
          <Input type="number" step="0.01" {...register('valor_total')} />
        </Field>
        <Field label="Forma de pagamento">
          <Input {...register('forma_pagamento')} />
        </Field>

        <Field label="Data assinatura">
          <Input type="date" {...register('data_assinatura')} />
        </Field>
        <Field label="Início vigência">
          <Input type="date" {...register('data_vigencia_inicio')} />
        </Field>

        <Field label="Fim vigência">
          <Input type="date" {...register('data_vigencia_fim')} />
        </Field>
        <Field label="Arquivo (URL)">
          <Input {...register('arquivo_url')} />
        </Field>
      </div>

      <Field label="Objeto">
        <Textarea rows={2} {...register('objeto')} />
      </Field>
      <Field label="Observações">
        <Textarea rows={2} {...register('observacoes')} />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Salvando…' : contrato ? 'Salvar' : 'Criar contrato'}
        </button>
      </div>
    </form>
  );
}

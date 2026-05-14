'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { clienteSchema, type ClienteInput } from '@/lib/schemas/cliente';
import { createCliente, updateCliente } from '@/lib/actions/clientes';
import { CLIENTE_CLASSIFS, CLIENTE_ORIGENS, type Cliente } from '@/types/db';

const origemOptions = CLIENTE_ORIGENS.map((c) => ({
  value: c,
  label: c.replaceAll('_', ' '),
}));
const classifOptions = CLIENTE_CLASSIFS.map((c) => ({
  value: c,
  label: c.replaceAll('_', ' '),
}));

export function ClienteForm({
  cliente,
  onDone,
  onError,
  onCancel,
}: {
  cliente: Cliente | null;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema) as never,
    defaultValues: cliente ?? { ativo: true, tipo_pessoa: 'PF' },
  });

  const onSubmit = (data: ClienteInput) => {
    startTransition(async () => {
      const res = cliente
        ? await updateCliente(cliente.id, data)
        : await createCliente(data);
      if (!res.ok) {
        onError(res.error);
        return;
      }
      onDone(cliente ? 'Cliente atualizado.' : 'Cliente criado.');
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nome completo *" error={errors.nome_completo?.message}>
          <Input {...register('nome_completo')} />
        </Field>
        <Field label="Tipo">
          <Select
            {...register('tipo_pessoa')}
            options={[
              { value: 'PF', label: 'Pessoa Física' },
              { value: 'PJ', label: 'Pessoa Jurídica' },
            ]}
            placeholder="Selecione…"
          />
        </Field>

        <Field label="CPF / CNPJ" error={errors.cpf_cnpj?.message}>
          <Input {...register('cpf_cnpj')} />
        </Field>
        <Field label="RG" error={errors.rg?.message}>
          <Input {...register('rg')} />
        </Field>

        <Field label="Data nascimento" error={errors.data_nascimento?.message}>
          <Input type="date" {...register('data_nascimento')} />
        </Field>
        <Field label="Estado civil">
          <Input {...register('estado_civil')} />
        </Field>

        <Field label="Profissão" error={errors.profissao?.message}>
          <Input {...register('profissao')} />
        </Field>
        <Field label="Origem do lead">
          <Select
            {...register('origem_lead')}
            options={origemOptions}
            placeholder="Selecione…"
          />
        </Field>

        <Field label="Classificação">
          <Select
            {...register('classificacao')}
            options={classifOptions}
            placeholder="Selecione…"
          />
        </Field>
        <Field label="Status">
          <Select
            {...register('ativo')}
            options={[
              { value: 'true', label: 'Ativo' },
              { value: 'false', label: 'Inativo' },
            ]}
          />
        </Field>

        <Field label="E-mail" error={errors.email?.message}>
          <Input type="email" {...register('email')} />
        </Field>
        <Field label="Telefone" error={errors.telefone?.message}>
          <Input {...register('telefone')} />
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
      </div>

      <Field label="Observações">
        <Textarea rows={3} {...register('observacoes')} />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Salvando…' : cliente ? 'Salvar' : 'Criar cliente'}
        </button>
      </div>
    </form>
  );
}

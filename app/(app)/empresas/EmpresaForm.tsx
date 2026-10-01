'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { empresaSchema, type EmpresaInput } from '@/lib/schemas/empresa';
import { createEmpresa, updateEmpresa } from '@/lib/actions/empresas';
import { EMPRESA_CATEGORIAS, type Empresa } from '@/types/db';

const categoriaOptions = EMPRESA_CATEGORIAS.map((c) => ({
  value: c,
  label: c.replaceAll('_', ' '),
}));

export function EmpresaForm({
  empresa,
  onDone,
  onError,
  onCancel,
}: {
  empresa: Empresa | null;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmpresaInput>({
    resolver: zodResolver(empresaSchema) as never,
    defaultValues: empresa
      ? {
          razao_social: empresa.razao_social,
          nome_fantasia: empresa.nome_fantasia,
          cnpj: empresa.cnpj,
          inscricao_estadual: empresa.inscricao_estadual,
          categoria: empresa.categoria,
          email: empresa.email,
          telefone: empresa.telefone,
          contato_responsavel: empresa.contato_responsavel,
          endereco: empresa.endereco,
          cidade: empresa.cidade,
          uf: empresa.uf,
          chave_pix: empresa.chave_pix,
          banco: empresa.banco,
          agencia: empresa.agencia,
          conta: empresa.conta,
          observacoes: empresa.observacoes,
          ativo: empresa.ativo,
        }
      : { ativo: true },
  });

  const onSubmit = (data: EmpresaInput) => {
    startTransition(async () => {
      const res = empresa
        ? await updateEmpresa(empresa.id, data)
        : await createEmpresa(data);
      if (!res.ok) {
        onError(res.error);
        return;
      }
      onDone(empresa ? 'Empresa atualizada.' : 'Empresa criada.');
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Razão social *" error={errors.razao_social?.message}>
          <Input autoComplete="organization" {...register('razao_social')} />
        </Field>
        <Field label="Nome fantasia" error={errors.nome_fantasia?.message}>
          <Input autoComplete="off" {...register('nome_fantasia')} />
        </Field>

        <Field label="CNPJ" hint="14 dígitos" error={errors.cnpj?.message}>
          <Input inputMode="numeric" autoComplete="off" {...register('cnpj')} />
        </Field>
        <Field label="Inscrição estadual" error={errors.inscricao_estadual?.message}>
          <Input inputMode="numeric" autoComplete="off" {...register('inscricao_estadual')} />
        </Field>

        <Field label="Categoria" error={errors.categoria?.message}>
          <Select
            {...register('categoria')}
            options={categoriaOptions}
            placeholder="Selecione…"
          />
        </Field>
        <Field label="Contato responsável" error={errors.contato_responsavel?.message}>
          <Input autoComplete="off" autoCapitalize="words" {...register('contato_responsavel')} />
        </Field>

        <Field label="E-mail" error={errors.email?.message}>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            {...register('email')}
          />
        </Field>
        <Field label="Telefone" error={errors.telefone?.message}>
          <Input type="tel" inputMode="tel" autoComplete="tel" {...register('telefone')} />
        </Field>

        <Field label="Endereço" error={errors.endereco?.message}>
          <Input autoComplete="street-address" {...register('endereco')} />
        </Field>
        <Field label="Cidade" error={errors.cidade?.message}>
          <Input autoComplete="address-level2" {...register('cidade')} />
        </Field>

        <Field label="UF" hint="2 letras" error={errors.uf?.message}>
          <Input
            maxLength={2}
            autoComplete="address-level1"
            autoCapitalize="characters"
            autoCorrect="off"
            {...register('uf')}
          />
        </Field>
        <Field label="Chave PIX" error={errors.chave_pix?.message}>
          <Input
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            {...register('chave_pix')}
          />
        </Field>

        <Field label="Banco" error={errors.banco?.message}>
          <Input {...register('banco')} />
        </Field>
        <Field label="Agência" error={errors.agencia?.message}>
          <Input inputMode="numeric" autoComplete="off" {...register('agencia')} />
        </Field>
        <Field label="Conta" error={errors.conta?.message}>
          <Input autoComplete="off" {...register('conta')} />
        </Field>

        <Field label="Status" error={errors.ativo?.message}>
          <Select
            {...register('ativo')}
            options={[
              { value: 'true', label: 'Ativo' },
              { value: 'false', label: 'Inativo' },
            ]}
          />
        </Field>
      </div>

      <Field label="Observações" error={errors.observacoes?.message}>
        <Textarea rows={3} {...register('observacoes')} />
      </Field>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn-ghost w-full sm:w-auto" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={isPending}>
          {isPending ? 'Salvando…' : empresa ? 'Salvar alterações' : 'Criar empresa'}
        </button>
      </div>
    </form>
  );
}

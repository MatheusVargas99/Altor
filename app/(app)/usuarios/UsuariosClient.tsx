'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toaster';
import {
  criarUsuario,
  atualizarUsuario,
  redefinirSenha,
  excluirUsuario,
} from '@/lib/actions/usuarios';
import type { UserRole } from '@/types/db';

type Profile = {
  id: string;
  nome: string;
  role: UserRole;
  ativo: boolean;
  ultimo_login: string | null;
  created_at: string;
};

const emptyForm = { nome: '', email: '', senha: '', confirma: '', role: 'OPERACIONAL' as UserRole };

export function UsuariosClient({ profiles, currentUserId }: { profiles: Profile[]; currentUserId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [pwTarget, setPwTarget] = useState<Profile | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ nome: '', role: 'OPERACIONAL' as UserRole, ativo: true });
  const [pwForm, setPwForm] = useState({ senha: '', confirma: '' });

  function fmtDate(s: string | null) {
    if (!s) return '—';
    return new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  const onCriar = () => {
    if (!form.nome.trim()) return toast({ kind: 'error', text: 'Nome obrigatório.' });
    if (!form.email.trim()) return toast({ kind: 'error', text: 'E-mail obrigatório.' });
    if (form.senha.length < 6) return toast({ kind: 'error', text: 'Senha mínimo 6 caracteres.' });
    if (form.senha !== form.confirma) return toast({ kind: 'error', text: 'Senhas não coincidem.' });
    startTransition(async () => {
      const res = await criarUsuario(form.nome.trim(), form.email.trim(), form.senha, form.role);
      if (!res.ok) return toast({ kind: 'error', text: res.error });
      toast({ kind: 'success', text: 'Usuário criado com sucesso.' });
      setCreateOpen(false);
      setForm(emptyForm);
      router.refresh();
    });
  };

  const onEditar = () => {
    if (!editTarget) return;
    if (!editForm.nome.trim()) return toast({ kind: 'error', text: 'Nome obrigatório.' });
    startTransition(async () => {
      const res = await atualizarUsuario(editTarget.id, editForm.nome.trim(), editForm.role, editForm.ativo);
      if (!res.ok) return toast({ kind: 'error', text: res.error });
      toast({ kind: 'success', text: 'Usuário atualizado.' });
      setEditTarget(null);
      router.refresh();
    });
  };

  const onRedefinir = () => {
    if (!pwTarget) return;
    if (pwForm.senha.length < 6) return toast({ kind: 'error', text: 'Senha mínimo 6 caracteres.' });
    if (pwForm.senha !== pwForm.confirma) return toast({ kind: 'error', text: 'Senhas não coincidem.' });
    startTransition(async () => {
      const res = await redefinirSenha(pwTarget.id, pwForm.senha);
      if (!res.ok) return toast({ kind: 'error', text: res.error });
      toast({ kind: 'success', text: 'Senha redefinida.' });
      setPwTarget(null);
      setPwForm({ senha: '', confirma: '' });
    });
  };

  const onExcluir = (p: Profile) => {
    if (p.id === currentUserId) return toast({ kind: 'error', text: 'Você não pode excluir sua própria conta.' });
    if (!confirm(`Excluir o usuário "${p.nome}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const res = await excluirUsuario(p.id);
      if (!res.ok) return toast({ kind: 'error', text: res.error });
      toast({ kind: 'success', text: 'Usuário excluído.' });
      router.refresh();
    });
  };

  const abrirEditar = (p: Profile) => {
    setEditTarget(p);
    setEditForm({ nome: p.nome, role: p.role, ativo: p.ativo });
  };
  const abrirSenha = (p: Profile) => {
    setPwTarget(p);
    setPwForm({ senha: '', confirma: '' });
  };

  const roleBadge = (p: Profile) => (
    <span className={`rounded px-2 py-0.5 text-xs ${p.role === 'ADMIN' ? 'bg-primary/20 text-primary' : 'bg-bg-3 text-text-dim'}`}>
      {p.role === 'ADMIN' ? 'Administrador' : 'Operacional'}
    </span>
  );
  const ativoBadge = (p: Profile) => (
    <span className={`rounded px-2 py-0.5 text-xs ${p.ativo ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
      {p.ativo ? 'Ativo' : 'Inativo'}
    </span>
  );

  // No celular as ações viram botões com borda e ≥ 40px de altura
  const acaoCls =
    'min-h-[40px] rounded-md border border-border px-3 text-sm hover:underline disabled:opacity-50 md:min-h-0 md:border-0 md:px-0 md:text-xs';
  const acoes = (p: Profile) => (
    <div className="flex flex-wrap justify-end gap-2 md:flex-nowrap">
      <button type="button" className={`${acaoCls} text-info`} onClick={() => abrirEditar(p)}>
        Editar
      </button>
      <button type="button" className={`${acaoCls} text-warn`} onClick={() => abrirSenha(p)}>
        Senha
      </button>
      {p.id !== currentUserId && (
        <button
          type="button"
          className={`${acaoCls} text-danger`}
          disabled={isPending}
          onClick={() => onExcluir(p)}
        >
          Excluir
        </button>
      )}
    </div>
  );

  const rodape = 'flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end';

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          className="btn-primary w-full sm:w-auto"
          onClick={() => { setForm(emptyForm); setCreateOpen(true); }}
        >
          + Novo usuário
        </button>
      </div>

      {/* Celular: um cartão por usuário */}
      <div className="space-y-2 md:hidden">
        {profiles.length === 0 && (
          <div className="rounded-lg border border-border px-3 py-6 text-center text-sm text-text-dim">
            Nenhum usuário encontrado.
          </div>
        )}
        {profiles.map((p) => (
          <div key={p.id} className="rounded-lg border border-border bg-bg-2 p-3 text-sm">
            <div className="mb-2 break-words font-medium text-text">
              {p.nome}
              {p.id === currentUserId && <span className="ml-2 text-xs text-primary">(você)</span>}
            </div>
            <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5">
              <dt className="pt-0.5 text-xs text-text-dim">Perfil</dt>
              <dd className="text-right">{roleBadge(p)}</dd>
              <dt className="pt-0.5 text-xs text-text-dim">Status</dt>
              <dd className="text-right">{ativoBadge(p)}</dd>
              <dt className="pt-0.5 text-xs text-text-dim">Último acesso</dt>
              <dd className="text-right text-xs text-text-dim">{fmtDate(p.ultimo_login)}</dd>
            </dl>
            <div className="mt-2 border-t border-border pt-2">{acoes(p)}</div>
          </div>
        ))}
      </div>

      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-bg-3 text-text-dim">
            <tr>
              <th className="px-4 py-2 text-left">Nome</th>
              <th className="px-4 py-2 text-left">E-mail</th>
              <th className="px-4 py-2 text-left">Perfil</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Último acesso</th>
              <th className="px-4 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-bg-3/30">
                <td className="px-4 py-2 font-medium">
                  {p.nome}
                  {p.id === currentUserId && (
                    <span className="ml-2 text-xs text-primary">(você)</span>
                  )}
                </td>
                <td className="px-4 py-2 text-text-dim text-xs break-all">{p.id}</td>
                <td className="px-4 py-2 whitespace-nowrap">{roleBadge(p)}</td>
                <td className="px-4 py-2 whitespace-nowrap">{ativoBadge(p)}</td>
                <td className="px-4 py-2 text-xs text-text-dim whitespace-nowrap">{fmtDate(p.ultimo_login)}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">{acoes(p)}</td>
              </tr>
            ))}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-dim">Nenhum usuário encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modais usam <form> para a tecla "Ir/Concluído" do teclado do celular enviar; noValidate mantém as mensagens via toast */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Novo usuário" size="md">
        <form noValidate className="space-y-4" onSubmit={(e) => { e.preventDefault(); onCriar(); }}>
          <div>
            <label className="label" htmlFor="novo-nome">Nome completo</label>
            <input
              id="novo-nome"
              className="input"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="next"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: João da Silva"
            />
          </div>
          <div>
            <label className="label" htmlFor="novo-email">E-mail</label>
            <input
              id="novo-email"
              className="input"
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="joao@exemplo.com"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="novo-senha">Senha</label>
              {/* new-password impede o navegador de preencher a senha do próprio admin */}
              <input
                id="novo-senha"
                className="input"
                type="password"
                autoComplete="new-password"
                enterKeyHint="next"
                value={form.senha}
                onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="label" htmlFor="novo-confirma">Confirmar senha</label>
              <input
                id="novo-confirma"
                className="input"
                type="password"
                autoComplete="new-password"
                enterKeyHint="done"
                value={form.confirma}
                onChange={(e) => setForm((f) => ({ ...f, confirma: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="novo-role">Perfil de acesso</label>
            <select id="novo-role" className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}>
              <option value="OPERACIONAL">Operacional — acesso geral, sem gestão de usuários</option>
              <option value="ADMIN">Administrador — acesso total</option>
            </select>
          </div>
          <div className={rodape}>
            <button type="button" className="btn-ghost w-full sm:w-auto" onClick={() => setCreateOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={isPending}>
              {isPending ? 'Criando…' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Editar: ${editTarget?.nome}`} size="sm">
        <form noValidate className="space-y-4" onSubmit={(e) => { e.preventDefault(); onEditar(); }}>
          <div>
            <label className="label" htmlFor="edit-nome">Nome</label>
            <input
              id="edit-nome"
              className="input"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="done"
              value={editForm.nome}
              onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="edit-role">Perfil de acesso</label>
            <select id="edit-role" className="input" value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as UserRole }))}>
              <option value="OPERACIONAL">Operacional</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="edit-ativo">Status</label>
            <select id="edit-ativo" className="input" value={editForm.ativo ? 'true' : 'false'} onChange={(e) => setEditForm((f) => ({ ...f, ativo: e.target.value === 'true' }))}>
              <option value="true">Ativo</option>
              <option value="false">Inativo (bloqueado)</option>
            </select>
          </div>
          <div className={rodape}>
            <button type="button" className="btn-ghost w-full sm:w-auto" onClick={() => setEditTarget(null)}>Cancelar</button>
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={isPending}>
              {isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!pwTarget} onClose={() => setPwTarget(null)} title={`Redefinir senha: ${pwTarget?.nome}`} size="sm">
        <form noValidate className="space-y-4" onSubmit={(e) => { e.preventDefault(); onRedefinir(); }}>
          <div>
            <label className="label" htmlFor="pw-senha">Nova senha</label>
            <input
              id="pw-senha"
              className="input"
              type="password"
              autoComplete="new-password"
              enterKeyHint="next"
              value={pwForm.senha}
              onChange={(e) => setPwForm((f) => ({ ...f, senha: e.target.value }))}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="label" htmlFor="pw-confirma">Confirmar nova senha</label>
            <input
              id="pw-confirma"
              className="input"
              type="password"
              autoComplete="new-password"
              enterKeyHint="done"
              value={pwForm.confirma}
              onChange={(e) => setPwForm((f) => ({ ...f, confirma: e.target.value }))}
            />
          </div>
          <div className={rodape}>
            <button type="button" className="btn-ghost w-full sm:w-auto" onClick={() => setPwTarget(null)}>Cancelar</button>
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={isPending}>
              {isPending ? 'Salvando…' : 'Redefinir senha'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

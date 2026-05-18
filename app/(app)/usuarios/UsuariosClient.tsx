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

  return (
    <>
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={() => { setForm(emptyForm); setCreateOpen(true); }}>
          + Novo usuário
        </button>
      </div>

      <div className="card overflow-x-auto">
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
                <td className="px-4 py-2 text-text-dim text-xs">{p.id}</td>
                <td className="px-4 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${p.role === 'ADMIN' ? 'bg-primary/20 text-primary' : 'bg-bg-3 text-text-dim'}`}>
                    {p.role === 'ADMIN' ? 'Administrador' : 'Operacional'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${p.ativo ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-text-dim">{fmtDate(p.ultimo_login)}</td>
                <td className="px-4 py-2 text-right text-xs whitespace-nowrap space-x-2">
                  <button
                    className="text-info hover:underline"
                    onClick={() => {
                      setEditTarget(p);
                      setEditForm({ nome: p.nome, role: p.role, ativo: p.ativo });
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className="text-warn hover:underline"
                    onClick={() => { setPwTarget(p); setPwForm({ senha: '', confirma: '' }); }}
                  >
                    Senha
                  </button>
                  {p.id !== currentUserId && (
                    <button className="text-danger hover:underline" disabled={isPending} onClick={() => onExcluir(p)}>
                      Excluir
                    </button>
                  )}
                </td>
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

      {/* Modal: Criar usuário */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Novo usuário" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Nome completo</label>
            <input className="input" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: João da Silva" />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="joao@exemplo.com" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Senha</label>
              <input className="input" type="password" value={form.senha} onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="label">Confirmar senha</label>
              <input className="input" type="password" value={form.confirma} onChange={(e) => setForm((f) => ({ ...f, confirma: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Perfil de acesso</label>
            <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}>
              <option value="OPERACIONAL">Operacional — acesso geral, sem gestão de usuários</option>
              <option value="ADMIN">Administrador — acesso total</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-ghost" onClick={() => setCreateOpen(false)}>Cancelar</button>
            <button className="btn-primary" disabled={isPending} onClick={onCriar}>Criar usuário</button>
          </div>
        </div>
      </Modal>

      {/* Modal: Editar usuário */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Editar: ${editTarget?.nome}`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Nome</label>
            <input className="input" value={editForm.nome} onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))} />
          </div>
          <div>
            <label className="label">Perfil de acesso</label>
            <select className="input" value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as UserRole }))}>
              <option value="OPERACIONAL">Operacional</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={editForm.ativo ? 'true' : 'false'} onChange={(e) => setEditForm((f) => ({ ...f, ativo: e.target.value === 'true' }))}>
              <option value="true">Ativo</option>
              <option value="false">Inativo (bloqueado)</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-ghost" onClick={() => setEditTarget(null)}>Cancelar</button>
            <button className="btn-primary" disabled={isPending} onClick={onEditar}>Salvar</button>
          </div>
        </div>
      </Modal>

      {/* Modal: Redefinir senha */}
      <Modal open={!!pwTarget} onClose={() => setPwTarget(null)} title={`Redefinir senha: ${pwTarget?.nome}`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Nova senha</label>
            <input className="input" type="password" value={pwForm.senha} onChange={(e) => setPwForm((f) => ({ ...f, senha: e.target.value }))} placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <label className="label">Confirmar nova senha</label>
            <input className="input" type="password" value={pwForm.confirma} onChange={(e) => setPwForm((f) => ({ ...f, confirma: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-ghost" onClick={() => setPwTarget(null)}>Cancelar</button>
            <button className="btn-primary" disabled={isPending} onClick={onRedefinir}>Redefinir senha</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

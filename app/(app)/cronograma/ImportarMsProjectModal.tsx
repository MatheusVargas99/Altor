'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toaster';
import { importarCronogramaMsProject } from '@/lib/actions/cronograma';
import { mapearEtapas, parseMsProjectXml, type MspTask } from '@/lib/msproject';
import { fmtBRL, fmtDate } from '@/lib/utils';
import { ETAPAS_EAP, type EtapaEap } from '@/types/db';

type EtapaAtual = {
  etapa: string;
  data_inicio_prevista: string | null;
  data_fim_prevista: string | null;
};

const periodo = (ini: string | null, fim: string | null) =>
  ini || fim ? `${fmtDate(ini) || '—'} → ${fmtDate(fim) || '—'}` : 'sem datas';

export function ImportarMsProjectModal({
  open,
  onClose,
  empreendimentoId,
  etapas,
  etapasSalvas,
  fisicoSalvo,
  totalTarefas,
}: {
  open: boolean;
  onClose: () => void;
  empreendimentoId: string;
  etapas: EtapaAtual[];
  etapasSalvas: ReadonlyMap<string, EtapaEap | null>;
  fisicoSalvo: ReadonlyMap<string, number>;
  totalTarefas: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [arquivo, setArquivo] = useState('');
  const [erro, setErro] = useState('');
  const [projeto, setProjeto] = useState<string | null>(null);
  const [tasks, setTasks] = useState<MspTask[]>([]);
  const [mapa, setMapa] = useState<(EtapaEap | null)[]>([]);
  const [atualizarDatas, setAtualizarDatas] = useState(true);
  const [atualizarFisico, setAtualizarFisico] = useState(false);
  const [atualizarCusto, setAtualizarCusto] = useState(false);
  const [dividirCusto, setDividirCusto] = useState(true);
  const [manterFisico, setManterFisico] = useState(true);

  const limpar = () => {
    setArquivo('');
    setErro('');
    setProjeto(null);
    setTasks([]);
    setMapa([]);
    setAtualizarDatas(true);
    setAtualizarFisico(false);
    setAtualizarCusto(false);
    setDividirCusto(true);
    setManterFisico(true);
  };

  const fechar = () => {
    limpar();
    onClose();
  };

  const onArquivo = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    limpar();
    setArquivo(file.name);
    try {
      const res = /\.mpp$/i.test(file.name)
        ? await (await import('@/lib/msproject-mpp')).parseMsProjectMpp(new Uint8Array(await file.arrayBuffer()))
        : parseMsProjectXml(await file.text());
      if (res.error) return setErro(res.error);
      if (res.tasks.length === 0) return setErro('Nenhuma tarefa encontrada no arquivo.');
      setProjeto(res.projectName);
      setTasks(res.tasks);
      setMapa(mapearEtapas(res.tasks, etapasSalvas));
    } catch {
      setErro('Não foi possível ler o arquivo.');
    }
  };

  // A escolha num grupo vale para tudo que está dentro dele.
  const definirEtapa = (i: number, etapa: EtapaEap | null) => {
    setMapa((atual) => {
      const novo = [...atual];
      novo[i] = etapa;
      for (let j = i + 1; j < tasks.length && tasks[j].nivel > tasks[i].nivel; j++) {
        novo[j] = etapa;
      }
      return novo;
    });
  };

  const custoDe = (t: MspTask) => (dividirCusto ? t.custo / 100 : t.custo);
  const pctDe = (t: MspTask) =>
    manterFisico && !t.resumo ? (fisicoSalvo.get(t.uid) ?? t.pct) : t.pct;
  const folhas = tasks.filter((t) => !t.resumo);
  const lancadas = folhas.filter((t) => fisicoSalvo.has(t.uid)).length;
  const temFisico = folhas.some((t) => pctDe(t) > 0);
  const temCusto = folhas.some((t) => t.custo > 0);
  const semEtapa = tasks.filter((t, i) => !t.resumo && !mapa[i]).length;

  const resumoEtapas = useMemo(() => {
    const porEtapa = new Map<string, { qtd: number; inicio: string | null; fim: string | null }>();
    tasks.forEach((t, i) => {
      const e = mapa[i];
      if (!e || t.resumo) return;
      const r = porEtapa.get(e) ?? { qtd: 0, inicio: null, fim: null };
      r.qtd += 1;
      if (t.inicio && (!r.inicio || t.inicio < r.inicio)) r.inicio = t.inicio;
      if (t.fim && (!r.fim || t.fim > r.fim)) r.fim = t.fim;
      porEtapa.set(e, r);
    });
    return ETAPAS_EAP.filter((e) => porEtapa.has(e)).map((e) => {
      const atual = etapas.find((x) => x.etapa === e);
      return {
        etapa: e,
        ...porEtapa.get(e)!,
        atual: periodo(atual?.data_inicio_prevista ?? null, atual?.data_fim_prevista ?? null),
      };
    });
  }, [tasks, mapa, etapas]);

  const importar = () => {
    startTransition(async () => {
      const res = await importarCronogramaMsProject({
        empreendimento_id: empreendimentoId,
        atualizar_datas: atualizarDatas,
        atualizar_fisico: atualizarFisico && temFisico,
        atualizar_custo: atualizarCusto && temCusto,
        tarefas: tasks.map((t, i) => ({
          ordem: i + 1,
          uid_msproject: t.uid || null,
          wbs: t.wbs || null,
          nivel: t.nivel,
          resumo: t.resumo,
          marco: t.marco,
          nome: t.nome,
          data_inicio: t.inicio,
          data_fim: t.fim,
          percentual_fisico: pctDe(t),
          custo_orcado: Number(custoDe(t).toFixed(2)),
          etapa: mapa[i],
        })),
      });
      if (!res.ok) return setErro(res.error);
      toast({
        kind: 'success',
        text: `${res.data?.tarefas ?? tasks.length} tarefas importadas; ${res.data?.etapas ?? 0} etapas atualizadas.`,
      });
      fechar();
      router.refresh();
    });
  };

  return (
    <Modal open={open} onClose={fechar} title="Importar cronograma do MS Project" size="xl">
      <div className="space-y-4">
        <div className="rounded border border-border bg-bg-3 p-3 text-xs leading-relaxed text-text-dim">
          Selecione o arquivo <strong className="text-text">.mpp</strong> do MS Project, ou um{' '}
          <strong className="text-text">.xml</strong> salvo por ele. As tarefas entram com a hierarquia
          do arquivo e cada uma fica ligada a uma etapa do sistema, para as contas a pagar continuarem
          caindo na etapa certa.
        </div>

        <label className="btn-ghost inline-flex max-w-full cursor-pointer">
          <span className="truncate">{arquivo || 'Selecionar arquivo .mpp ou .xml'}</span>
          <input type="file" accept=".xml,.mpp,text/xml,application/xml" className="hidden" onChange={onArquivo} />
        </label>

        {erro && (
          <p className="rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>
        )}

        {tasks.length > 0 && (
          <>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-dim">
              {projeto && <span>Projeto: <strong className="text-text">{projeto}</strong></span>}
              <span><strong className="text-text">{tasks.length}</strong> tarefas no arquivo</span>
              {semEtapa > 0 && (
                <span className="text-warn">{semEtapa} sem etapa (entram na lista, mas não alimentam nenhuma etapa)</span>
              )}
            </div>

            {totalTarefas > 0 && (
              <p className="rounded border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
                Esta obra já tem {totalTarefas} tarefas importadas. Elas serão substituídas pelas deste arquivo.
                As etapas, contas a pagar e compras não são apagadas.
              </p>
            )}

            <div className="space-y-2 text-sm">
              {lancadas > 0 && (
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={manterFisico}
                    onChange={(e) => setManterFisico(e.target.checked)}
                  />
                  <span>
                    Manter o % físico lançado no sistema em {lancadas} {lancadas === 1 ? 'tarefa' : 'tarefas'}
                    <span className="block text-xs text-text-dim">Desmarque para usar o % do arquivo nessas tarefas.</span>
                  </span>
                </label>
              )}
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={atualizarDatas}
                  onChange={(e) => setAtualizarDatas(e.target.checked)}
                />
                <span>Atualizar as datas previstas das etapas com as do arquivo</span>
              </label>
              <label className={`flex items-start gap-2 ${temFisico ? 'cursor-pointer' : 'opacity-50'}`}>
                <input
                  type="checkbox"
                  className="mt-0.5"
                  disabled={!temFisico}
                  checked={atualizarFisico && temFisico}
                  onChange={(e) => setAtualizarFisico(e.target.checked)}
                />
                <span>
                  Substituir o % físico das etapas pelo calculado das tarefas
                  {!temFisico && <span className="block text-xs text-text-dim">Todas as tarefas estão com 0%, então o avanço lançado no sistema fica como está.</span>}
                </span>
              </label>
              {temCusto && (
                <>
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={atualizarCusto}
                      onChange={(e) => setAtualizarCusto(e.target.checked)}
                    />
                    <span>Substituir o valor orçado das etapas pelo custo do arquivo</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={dividirCusto}
                      onChange={(e) => setDividirCusto(e.target.checked)}
                    />
                    <span>Custos ÷ 100 (padrão do XML do MS Project)</span>
                  </label>
                </>
              )}
            </div>

            {atualizarDatas && resumoEtapas.length > 0 && (
              <div className="overflow-x-auto rounded border border-border">
                <table className="w-full whitespace-nowrap text-xs">
                  <thead className="bg-bg-3 text-text-dim">
                    <tr>
                      <th className="px-3 py-2 text-left">Etapa</th>
                      <th className="px-3 py-2 text-right">Tarefas</th>
                      <th className="px-3 py-2 text-left">Datas hoje</th>
                      <th className="px-3 py-2 text-left">Datas após importar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumoEtapas.map((r) => (
                      <tr key={r.etapa} className="border-t border-border">
                        <td className="px-3 py-1.5">{r.etapa.replaceAll('_', ' ')}</td>
                        <td className="px-3 py-1.5 text-right text-text-dim">{r.qtd}</td>
                        <td className="px-3 py-1.5 text-text-dim">{r.atual}</td>
                        <td className="px-3 py-1.5 text-primary">{periodo(r.inicio, r.fim)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="max-h-80 overflow-auto rounded border border-border">
              <table className="w-full min-w-[720px] text-xs">
                <thead className="sticky top-0 z-10 bg-bg-3 text-text-dim">
                  <tr>
                    <th className="w-20 px-3 py-2 text-left">EAP</th>
                    <th className="px-3 py-2 text-left">Tarefa</th>
                    <th className="w-44 px-3 py-2 text-left">Período</th>
                    <th className="w-12 px-3 py-2 text-right">%</th>
                    {temCusto && <th className="w-28 px-3 py-2 text-right">Custo</th>}
                    <th className="w-56 px-3 py-2 text-left">Etapa do sistema</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t, i) => (
                    <tr key={t.uid || t.id} className={`border-t border-border ${t.resumo ? 'bg-bg-3/40 font-medium' : ''}`}>
                      <td className="px-3 py-1 font-mono text-text-dim">{t.wbs || '—'}</td>
                      <td className="px-3 py-1" style={{ paddingLeft: `${0.75 + (t.nivel - 1) * 0.8}rem` }}>
                        {t.marco && <span className="mr-1 text-primary">◆</span>}
                        {t.nome}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1 text-text-dim">{periodo(t.inicio, t.fim)}</td>
                      <td className="px-3 py-1 text-right text-text-dim">{pctDe(t).toFixed(0)}%</td>
                      {temCusto && <td className="px-3 py-1 text-right">{fmtBRL(custoDe(t))}</td>}
                      <td className="px-3 py-1">
                        <select
                          value={mapa[i] ?? ''}
                          aria-label={`Etapa do sistema para ${t.nome}`}
                          onChange={(e) => definirEtapa(i, (e.target.value || null) as EtapaEap | null)}
                          className="w-full rounded border border-border bg-bg-2 px-1.5 py-1 text-base lg:text-xs"
                        >
                          <option value="">Sem etapa</option>
                          {ETAPAS_EAP.map((e) => (
                            <option key={e} value={e}>{e.replaceAll('_', ' ')}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost w-full sm:w-auto" onClick={fechar}>Cancelar</button>
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            disabled={isPending || tasks.length === 0}
            onClick={importar}
          >
            {isPending ? 'Importando…' : `Importar ${tasks.length || ''} tarefas`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

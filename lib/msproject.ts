// Leitura do cronograma do MS Project no formato XML (MSPDI).
// No MS Project: Arquivo -> Salvar como -> tipo "XML (*.xml)".
// Usa o DOMParser do navegador; o .mpp é lido em lib/msproject-mpp.ts.

import type { EtapaEap } from '@/types/db';

export type MspTask = {
  uid: string;
  id: number;
  wbs: string;
  nivel: number;
  resumo: boolean;
  marco: boolean;
  nome: string;
  inicio: string | null;
  fim: string | null;
  pct: number;
  custo: number; // valor bruto do XML; o MS Project grava em centavos
};

export type MspParseResult = {
  tasks: MspTask[];
  projectName: string | null;
  error?: string;
};

const SALVAR_COMO_XML = 'No MS Project use Arquivo → Salvar como → tipo "XML (*.xml)".';

/** Primeiro filho direto com o nome informado, ignorando o namespace. */
function childText(el: Element, name: string): string | null {
  for (const c of Array.from(el.children)) {
    if (c.localName === name) return c.textContent;
  }
  return null;
}

function dateOnly(v: string | null): string | null {
  if (!v) return null;
  const d = v.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function toNum(v: string | null): number {
  const n = parseFloat(v ?? '');
  return Number.isFinite(n) ? n : 0;
}

export function parseMsProjectXml(xml: string): MspParseResult {
  const falha = (error: string): MspParseResult => ({ tasks: [], projectName: null, error });

  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return falha(`Arquivo XML inválido ou corrompido. ${SALVAR_COMO_XML}`);
  }

  const root = doc.documentElement;
  if (!root || root.localName !== 'Project') {
    return falha(`Esse arquivo não é um cronograma do MS Project. ${SALVAR_COMO_XML}`);
  }

  const container = Array.from(root.children).find((e) => e.localName === 'Tasks');
  const taskEls = container
    ? Array.from(container.children).filter((e) => e.localName === 'Task')
    : [];

  const tasks: MspTask[] = [];
  for (const t of taskEls) {
    const id = Math.trunc(toNum(childText(t, 'ID')));
    const nome = (childText(t, 'Name') ?? '').trim();
    // ID 0 é o resumo do próprio projeto; Active=0 é tarefa desativada.
    if (!nome || id === 0 || childText(t, 'Active') === '0') continue;

    tasks.push({
      uid: childText(t, 'UID') ?? '',
      id,
      wbs: (childText(t, 'OutlineNumber') ?? childText(t, 'WBS') ?? '').trim(),
      nivel: Math.max(1, Math.trunc(toNum(childText(t, 'OutlineLevel')))),
      resumo: childText(t, 'Summary') === '1',
      marco: childText(t, 'Milestone') === '1',
      nome,
      inicio: dateOnly(childText(t, 'Start')),
      fim: dateOnly(childText(t, 'Finish')),
      pct: Math.max(0, Math.min(100, toNum(childText(t, 'PercentComplete')))),
      custo: Math.max(0, toNum(childText(t, 'Cost'))),
    });
  }

  return {
    tasks,
    projectName: (childText(root, 'Title') ?? childText(root, 'Name'))?.trim() || null,
  };
}

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Só palavras que identificam a etapa por si: "Instalações" e "Cobertura", por
// exemplo, aparecem em etapas diferentes e ficam de fora de propósito.
const REGRAS: [RegExp, EtapaEap][] = [
  [/terraplen|movimento de terra|contenc|escavac/, 'M0_TERRAPLENAGEM'],
  [/preliminar|canteiro|tapume|sondagem|limpeza do terreno/, 'M0_PRELIMINARES'],
  [/fundac|estaca|sapata|radier/, 'M1_FUNDACAO'],
  [/\bestrutura|\bpilar|\bviga|\blaje/, 'M2_ESTRUTURA'],
  [/alvenaria|fechamento|vedac/, 'M3_ALVENARIA'],
  [/eletric/, 'M3_INSTALACOES_ELETRICAS'],
  [/hidraul|sanitari|esgoto|pluvial|\bgas\b/, 'M3_INSTALACOES_HIDRAULICAS'],
  [/esquadria|contra-?marco|\bjanela|\bporta|\bvidro/, 'M4_ESQUADRIAS'],
  [/pintura|textura|selador/, 'M4_PINTURA'],
  [/louca|\bmetais|bancada/, 'M4_LOUCAS_METAIS'],
  [/reboco|emboco|contrapiso|revestimento|ceramic|porcelanato|azulejo|\bpiso|gesso|forro/, 'M4_REVESTIMENTO'],
  [/\bmuro|pavimentac|paisagismo|fachada|\bhall\b|garagem|area comum/, 'M5_AREA_COMUM'],
  [/habite|vistoria/, 'M6_HABITESE'],
  [/entrega|\bchaves\b/, 'M7_ENTREGA'],
];

export function sugerirEtapa(nome: string): EtapaEap | null {
  const n = normalizar(nome);
  return REGRAS.find(([re]) => re.test(n))?.[1] ?? null;
}

/**
 * Etapa de cada tarefa, na ordem do arquivo: a escolha salva na importação
 * anterior (pelo UID do MS Project), senão o próprio nome, senão a etapa do
 * grupo a que ela pertence.
 */
export function mapearEtapas(
  tasks: MspTask[],
  salvas: ReadonlyMap<string, EtapaEap | null> = new Map(),
): (EtapaEap | null)[] {
  const porNivel: (EtapaEap | null)[] = [];
  return tasks.map((t) => {
    const herdada = porNivel[t.nivel - 1] ?? null;
    const etapa = salvas.has(t.uid)
      ? (salvas.get(t.uid) ?? null)
      : (sugerirEtapa(t.nome) ?? herdada);
    porNivel[t.nivel] = etapa;
    porNivel.length = t.nivel + 1;
    return etapa;
  });
}

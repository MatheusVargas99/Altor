// Leitura do .mpp binário no navegador, sem enviar o arquivo a nenhum servidor.
//
// O `readProject` do mppwriter não serve aqui: não abre o formato do Project
// 2007, não devolve o ID (a ordem do cronograma) nem custo, e repete tarefas.
// Por isso usamos só os blocos de baixo nível dele. Conferido campo a campo
// contra o XML exportado pelo próprio MS Project.

import type { MspParseResult, MspTask } from './msproject';

const SALVAR_DE_NOVO =
  'Abra o arquivo no MS Project e salve de novo como .mpp ou como XML (*.xml).';

// "   114" é o Project 2010 em diante; "   112", o formato do Project 2007.
const PASTAS = ['   114', '   112'];

// Campos que o mppwriter não nomeia.
const CAMPO_CUSTO = 5;
const CAMPO_ATIVA = 479;

// Registro curto é só um marcador, sem dados da tarefa.
const TAMANHO_MINIMO = 100;

export async function parseMsProjectMpp(bytes: Uint8Array): Promise<MspParseResult> {
  const falha = (error: string): MspParseResult => ({ tasks: [], projectName: null, error });

  try {
    const M = await import('mppwriter');
    const raiz = M.readCfb(bytes);
    const pasta = PASTAS.find((p) => raiz.get(`${p}/Props`));
    if (!pasta) {
      return falha(`Esta versão do arquivo .mpp não é suportada. ${SALVAR_DE_NOVO}`);
    }

    const stream = (nome: string) => raiz.get(`${pasta}/TBkndTask/${nome}`);
    const props = M.parseProps(raiz.get(`${pasta}/Props`)!).values;
    const mapa = props.get(M.PROPS_TASK_FIELD_MAP);
    const fixedMeta = stream('FixedMeta');
    const fixedData = stream('FixedData');
    const varMeta = stream('VarMeta');
    const varData = stream('Var2Data');
    if (!mapa || !fixedMeta || !fixedData || !varMeta || !varData) {
      return falha(`O arquivo não tem tarefas legíveis. ${SALVAR_DE_NOVO}`);
    }

    const campos = new Map<number, { block: number; offset: number }>();
    const bits = new Map<number, number>();
    M.parseFieldMap(mapa).forEach((item, i) => {
      if (item.inFixed && !campos.has(item.fieldId)) campos.set(item.fieldId, item);
      if (!bits.has(item.fieldId)) bits.set(item.fieldId, i);
    });

    const metas = M.parseFixedMetaAuto(fixedMeta, M.TASK_META_SIZE).items;
    const registros = M.splitFixedData(fixedData, metas);
    const fixed2Meta = stream('Fixed2Meta');
    const fixed2Data = stream('Fixed2Data');
    const metas2 = fixed2Meta ? M.parseFixedMetaAuto(fixed2Meta, M.TASK_META2_SIZE).items : [];
    const registros2 = fixed2Data ? M.splitFixedData(fixed2Data, metas2) : [];
    const textos = M.parseVarMeta(varMeta).table;

    const vazio = new Uint8Array(0);
    const ler = (i: number, campo: number, tamanho: number) => {
      const item = campos.get(campo);
      if (!item) return null;
      const dados = (item.block === 0 ? registros[i] : registros2[i]) ?? vazio;
      if (item.offset + tamanho > dados.length) return null;
      return {
        dados,
        offset: item.offset,
        view: new DataView(dados.buffer, dados.byteOffset, dados.byteLength),
      };
    };
    const u32 = (i: number, campo: number) => {
      const c = ler(i, campo, 4);
      return c ? c.view.getUint32(c.offset, true) : null;
    };
    const u16 = (i: number, campo: number) => {
      const c = ler(i, campo, 2);
      return c ? c.view.getUint16(c.offset, true) : null;
    };
    const f64 = (i: number, campo: number) => {
      const c = ler(i, campo, 8);
      return c ? c.view.getFloat64(c.offset, true) : null;
    };
    const data = (i: number, campo: number) => {
      const c = ler(i, campo, 4);
      return c ? (M.decodeTimestamp(c.dados, c.offset)?.toISOString().slice(0, 10) ?? null) : null;
    };
    const flag = (i: number, campo: number) => {
      const bit = bits.get(campo);
      if (bit === undefined || i >= metas.length) return null;
      return Boolean(M.metaBit(metas[i], metas2[i] ?? vazio, bit));
    };

    // O Project pode manter mais de um registro do mesmo UID; vale o último.
    const porUid = new Map<number, MspTask & { ativa: boolean }>();
    registros.forEach((registro, i) => {
      if (registro.length <= TAMANHO_MINIMO) return;
      const uid = u32(i, M.NATIVE.UNIQUE_ID);
      if (!uid) return; // UID 0 é o resumo do próprio projeto
      const offset = textos.get(uid)?.get(M.NATIVE.NAME);
      const bruto = offset === undefined ? null : M.readVar(varData, offset);
      const nome = bruto ? M.decodeUnicode(bruto).trim() : '';
      if (!nome) return; // linha em branco do cronograma

      porUid.set(uid, {
        uid: String(uid),
        id: u32(i, M.NATIVE.ID) ?? 0,
        wbs: '',
        nivel: u16(i, M.NATIVE.OUTLINE_LEVEL) || 1,
        resumo: false,
        marco: flag(i, M.NATIVE.MILESTONE) ?? false,
        nome,
        inicio: data(i, M.NATIVE.START),
        fim: data(i, M.NATIVE.FINISH),
        pct: Math.max(0, Math.min(100, u16(i, M.NATIVE.PERCENT_COMPLETE) ?? 0)),
        custo: Math.max(0, f64(i, CAMPO_CUSTO) ?? 0),
        ativa: flag(i, CAMPO_ATIVA) ?? true,
      });
    });

    const ordenadas = Array.from(porUid.values()).sort((a, b) => a.id - b.id);

    // A numeração e os grupos contam as desativadas, como no MS Project.
    const contagem: number[] = [];
    ordenadas.forEach((t, i) => {
      contagem.length = t.nivel;
      for (let n = 0; n < t.nivel - 1; n++) contagem[n] ??= 1;
      contagem[t.nivel - 1] = (contagem[t.nivel - 1] ?? 0) + 1;
      t.wbs = contagem.join('.');
      t.resumo = (ordenadas[i + 1]?.nivel ?? 0) > t.nivel;
      if (t.resumo) t.marco = false;
    });

    const titulo = props.get(M.PROPS_TITLE);
    return {
      tasks: ordenadas.filter((t) => t.ativa).map(({ ativa: _ativa, ...t }) => t),
      projectName: (titulo ? M.decodeUnicode(titulo).trim() : '') || null,
    };
  } catch {
    return falha(`Não foi possível ler o arquivo .mpp. Se ele tiver senha, retire-a. ${SALVAR_DE_NOVO}`);
  }
}

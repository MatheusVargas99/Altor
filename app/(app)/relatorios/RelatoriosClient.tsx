'use client';

import { useRouter } from 'next/navigation';

type CRRow = {
  descricao: string;
  numero_parcela: string | null;
  valor_original: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
};

type CPRow = {
  descricao: string;
  numero_documento: string | null;
  valor_original: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  categoria: string | null;
};

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export function RelatoriosClient({
  empreendimentos,
  obraAtual,
  tipoAtual,
  periodoInicio,
  periodoFim,
  obraInfo,
  crRows,
  cpRows,
}: {
  empreendimentos: { id: string; nome: string; codigo_curto: string | null }[];
  obraAtual: string;
  tipoAtual: 'SEMANAL' | 'QUINZENAL' | 'MENSAL';
  periodoInicio: string;
  periodoFim: string;
  obraInfo: { nome: string } | null;
  crRows: CRRow[];
  cpRows: CPRow[];
}) {
  const router = useRouter();

  const totalCROriginal = crRows.reduce((s, r) => s + Number(r.valor_original), 0);
  const totalCRPago = crRows.reduce((s, r) => s + Number(r.valor_pago), 0);
  const totalCPOriginal = cpRows.reduce((s, r) => s + Number(r.valor_original), 0);
  const totalCPPago = cpRows.reduce((s, r) => s + Number(r.valor_pago), 0);
  const saldo = totalCRPago - totalCPPago;

  const handleGerarPDF = () => {
    const titulo = `Relatório ${tipoAtual} — ${obraInfo ? obraInfo.nome : 'Todas obras'}`;
    const periodo = `Período: ${fmtDate(periodoInicio)} a ${fmtDate(periodoFim)}`;
    const geradoEm = `Gerado em: ${new Date().toLocaleString('pt-BR')}`;

    const crHtml = crRows.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:#888">Nenhum registro</td></tr>' :
      crRows.map((r) => `
        <tr>
          <td>${r.descricao}${r.numero_parcela ? ` (${r.numero_parcela})` : ''}</td>
          <td>${fmtDate(r.data_vencimento)}</td>
          <td style="text-align:right">${fmtBRL(Number(r.valor_original))}</td>
          <td style="text-align:right">${fmtBRL(Number(r.valor_pago))}</td>
          <td><span style="padding:2px 6px;border-radius:3px;font-size:11px;background:${r.status === 'PAGO' ? '#d1fae5' : r.status === 'ATRASADO' ? '#fee2e2' : '#fef3c7'};color:${r.status === 'PAGO' ? '#065f46' : r.status === 'ATRASADO' ? '#991b1b' : '#92400e'}">${r.status}</span></td>
        </tr>`).join('');

    const cpHtml = cpRows.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#888">Nenhum registro</td></tr>' :
      cpRows.map((r) => `
        <tr>
          <td>${r.descricao}${r.numero_documento ? ` (${r.numero_documento})` : ''}</td>
          <td>${r.categoria?.replaceAll('_', ' ') ?? '—'}</td>
          <td>${fmtDate(r.data_vencimento)}</td>
          <td style="text-align:right">${fmtBRL(Number(r.valor_original))}</td>
          <td style="text-align:right">${fmtBRL(Number(r.valor_pago))}</td>
          <td><span style="padding:2px 6px;border-radius:3px;font-size:11px;background:${r.status === 'PAGO' ? '#d1fae5' : r.status === 'ATRASADO' ? '#fee2e2' : '#fef3c7'};color:${r.status === 'PAGO' ? '#065f46' : r.status === 'ATRASADO' ? '#991b1b' : '#92400e'}">${r.status}</span></td>
        </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 24px; }
  h1 { font-size: 20px; color: #92600a; margin-bottom: 4px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 20px; }
  h2 { font-size: 15px; color: #333; margin: 20px 0 8px; border-bottom: 2px solid #C9A961; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f5f0e8; text-align: left; padding: 6px 8px; font-size: 12px; border: 1px solid #ddd; }
  td { padding: 5px 8px; border: 1px solid #eee; font-size: 12px; }
  tr:nth-child(even) { background: #fafafa; }
  .summary { background: #f5f0e8; padding: 12px 16px; border-radius: 6px; margin-top: 16px; }
  .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .summary-row.total { font-weight: bold; border-top: 1px solid #C9A961; margin-top: 4px; padding-top: 6px; }
  .pos { color: #065f46; } .neg { color: #991b1b; }
  @media print { body { padding: 10px; } }
</style>
</head>
<body>
<h1>ALTOR — ${titulo}</h1>
<div class="meta">${periodo} &nbsp;·&nbsp; ${geradoEm}</div>

<h2>Contas a Receber (${crRows.length} lançamento(s))</h2>
<table>
  <thead><tr><th>Descrição</th><th>Vencimento</th><th style="text-align:right">Valor</th><th style="text-align:right">Pago</th><th>Status</th></tr></thead>
  <tbody>${crHtml}</tbody>
</table>

<h2>Contas a Pagar (${cpRows.length} lançamento(s))</h2>
<table>
  <thead><tr><th>Descrição</th><th>Categoria</th><th>Vencimento</th><th style="text-align:right">Valor</th><th style="text-align:right">Pago</th><th>Status</th></tr></thead>
  <tbody>${cpHtml}</tbody>
</table>

<div class="summary">
  <div class="summary-row"><span>Total a receber no período</span><span>${fmtBRL(totalCROriginal)}</span></div>
  <div class="summary-row"><span>Total recebido no período</span><span class="pos">${fmtBRL(totalCRPago)}</span></div>
  <div class="summary-row"><span>Total a pagar no período</span><span>${fmtBRL(totalCPOriginal)}</span></div>
  <div class="summary-row"><span>Total pago no período</span><span class="neg">${fmtBRL(totalCPPago)}</span></div>
  <div class="summary-row total"><span>Resultado do período (recebido - pago)</span><span class="${saldo >= 0 ? 'pos' : 'neg'}">${fmtBRL(saldo)}</span></div>
</div>
</body>
</html>`;

    // Use hidden iframe to avoid popup blocker
    const existing = document.getElementById('__pdf_iframe__');
    if (existing) existing.remove();
    const iframe = document.createElement('iframe');
    iframe.id = '__pdf_iframe__';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 400);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Empreendimento</label>
            <select
              className="input"
              value={obraAtual}
              onChange={(e) => {
                const params = new URLSearchParams({ tipo: tipoAtual });
                if (e.target.value) params.set('obra', e.target.value);
                router.push(`/relatorios?${params.toString()}`);
              }}
            >
              <option value="">Todos</option>
              {empreendimentos.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Periodicidade</label>
            <select
              className="input"
              value={tipoAtual}
              onChange={(e) => {
                const params = new URLSearchParams({ tipo: e.target.value });
                if (obraAtual) params.set('obra', obraAtual);
                router.push(`/relatorios?${params.toString()}`);
              }}
            >
              <option value="SEMANAL">Semanal (últimos 7d)</option>
              <option value="QUINZENAL">Quinzenal (últimos 15d)</option>
              <option value="MENSAL">Mensal (últimos 30d)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="btn-primary w-full"
              onClick={handleGerarPDF}
            >
              Gerar PDF / Imprimir
            </button>
          </div>
        </div>

        <div className="text-sm text-text-dim border-t border-border pt-3">
          Período: <strong className="text-text">{fmtDate(periodoInicio)}</strong> a <strong className="text-text">{fmtDate(periodoFim)}</strong>
          {obraInfo && <> · Obra: <strong className="text-text">{obraInfo.nome}</strong></>}
        </div>
      </div>

      {/* Preview summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card">
          <div className="text-xs text-text-dim uppercase">CR no período</div>
          <div className="text-lg font-semibold text-text mt-1">{crRows.length} lanç.</div>
          <div className="text-sm text-success">{fmtBRL(totalCROriginal)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-text-dim uppercase">CP no período</div>
          <div className="text-lg font-semibold text-text mt-1">{cpRows.length} lanç.</div>
          <div className="text-sm text-warn">{fmtBRL(totalCPOriginal)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-text-dim uppercase">Recebido</div>
          <div className="text-lg font-semibold text-success mt-1">{fmtBRL(totalCRPago)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-text-dim uppercase">Resultado</div>
          <div className={`text-lg font-semibold mt-1 ${saldo >= 0 ? 'text-success' : 'text-danger'}`}>
            {fmtBRL(saldo)}
          </div>
        </div>
      </div>

      {/* CR preview table */}
      <div>
        <h3 className="text-sm font-medium text-text mb-2">Contas a Receber ({crRows.length})</h3>
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full text-xs">
            <thead className="bg-bg-3 text-text-dim">
              <tr>
                <th className="px-3 py-2 text-left">Descrição</th>
                <th className="px-3 py-2 text-left">Vencimento</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-right">Pago</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {crRows.slice(0, 10).map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-1.5">{r.descricao}{r.numero_parcela ? ` (${r.numero_parcela})` : ''}</td>
                  <td className="px-3 py-1.5">{fmtDate(r.data_vencimento)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtBRL(Number(r.valor_original))}</td>
                  <td className="px-3 py-1.5 text-right">{fmtBRL(Number(r.valor_pago))}</td>
                  <td className="px-3 py-1.5">{r.status}</td>
                </tr>
              ))}
              {crRows.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-4 text-center text-text-dim">Nenhum registro no período.</td></tr>
              )}
              {crRows.length > 10 && (
                <tr><td colSpan={5} className="px-3 py-2 text-center text-text-dim">... e mais {crRows.length - 10} registros no PDF</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CP preview table */}
      <div>
        <h3 className="text-sm font-medium text-text mb-2">Contas a Pagar ({cpRows.length})</h3>
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full text-xs">
            <thead className="bg-bg-3 text-text-dim">
              <tr>
                <th className="px-3 py-2 text-left">Descrição</th>
                <th className="px-3 py-2 text-left">Categoria</th>
                <th className="px-3 py-2 text-left">Vencimento</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-right">Pago</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {cpRows.slice(0, 10).map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-1.5">{r.descricao}{r.numero_documento ? ` (${r.numero_documento})` : ''}</td>
                  <td className="px-3 py-1.5">{r.categoria?.replaceAll('_', ' ') ?? '—'}</td>
                  <td className="px-3 py-1.5">{fmtDate(r.data_vencimento)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtBRL(Number(r.valor_original))}</td>
                  <td className="px-3 py-1.5 text-right">{fmtBRL(Number(r.valor_pago))}</td>
                  <td className="px-3 py-1.5">{r.status}</td>
                </tr>
              ))}
              {cpRows.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-4 text-center text-text-dim">Nenhum registro no período.</td></tr>
              )}
              {cpRows.length > 10 && (
                <tr><td colSpan={6} className="px-3 py-2 text-center text-text-dim">... e mais {cpRows.length - 10} registros no PDF</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

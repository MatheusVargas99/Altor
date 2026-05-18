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
    const tipoLabel: Record<string, string> = { SEMANAL: 'Semanal', QUINZENAL: 'Quinzenal', MENSAL: 'Mensal' };
    const obraLabel = obraInfo ? obraInfo.nome : 'Todas as obras';
    const geradoEm = new Date().toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });

    const statusBadge = (s: string) => {
      const bg = s === 'PAGO' ? '#e6f4ee' : s === 'ATRASADO' ? '#fde8e8' : '#fef9e7';
      const color = s === 'PAGO' ? '#1a6b3c' : s === 'ATRASADO' ? '#a31515' : '#7a5c00';
      return `<span style="display:inline-block;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:600;letter-spacing:.4px;background:${bg};color:${color}">${s}</span>`;
    };

    const crHtml = crRows.length === 0
      ? '<tr><td colspan="5" style="text-align:center;padding:12px;color:#888;font-style:italic">Nenhum lançamento no período</td></tr>'
      : crRows.map((r, i) => `
        <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9f7f3'}">
          <td style="padding:6px 10px">${r.descricao}${r.numero_parcela ? ` <span style="color:#888;font-size:11px">(${r.numero_parcela})</span>` : ''}</td>
          <td style="padding:6px 10px;white-space:nowrap">${fmtDate(r.data_vencimento)}</td>
          <td style="padding:6px 10px;text-align:right;white-space:nowrap">${fmtBRL(Number(r.valor_original))}</td>
          <td style="padding:6px 10px;text-align:right;white-space:nowrap;font-weight:600;color:#1a6b3c">${fmtBRL(Number(r.valor_pago))}</td>
          <td style="padding:6px 10px">${statusBadge(r.status)}</td>
        </tr>`).join('');

    const cpHtml = cpRows.length === 0
      ? '<tr><td colspan="6" style="text-align:center;padding:12px;color:#888;font-style:italic">Nenhum lançamento no período</td></tr>'
      : cpRows.map((r, i) => `
        <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9f7f3'}">
          <td style="padding:6px 10px">${r.descricao}${r.numero_documento ? ` <span style="color:#888;font-size:11px">(${r.numero_documento})</span>` : ''}</td>
          <td style="padding:6px 10px;font-size:11px;color:#555">${r.categoria?.replaceAll('_', ' ') ?? '—'}</td>
          <td style="padding:6px 10px;white-space:nowrap">${fmtDate(r.data_vencimento)}</td>
          <td style="padding:6px 10px;text-align:right;white-space:nowrap">${fmtBRL(Number(r.valor_original))}</td>
          <td style="padding:6px 10px;text-align:right;white-space:nowrap;font-weight:600;color:#a31515">${fmtBRL(Number(r.valor_pago))}</td>
          <td style="padding:6px 10px">${statusBadge(r.status)}</td>
        </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório ${tipoLabel[tipoAtual]} — ${obraLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }

  /* Cabeçalho */
  .header { background: #0A0A0A; color: #F5F1E8; padding: 28px 36px 20px; display: flex; align-items: center; justify-content: space-between; }
  .header-left { display: flex; align-items: center; gap: 16px; }
  .logo-mark { width: 44px; height: 44px; }
  .brand-name { font-family: Georgia, 'Times New Roman', serif; font-size: 22px; letter-spacing: 6px; color: #B8923A; text-transform: uppercase; line-height: 1; }
  .brand-sub { font-size: 9px; letter-spacing: 4px; color: #888; text-transform: uppercase; margin-top: 3px; }
  .header-right { text-align: right; font-size: 11px; color: #aaa; line-height: 1.6; }

  /* Linha dourada */
  .gold-rule { height: 2px; background: linear-gradient(90deg, #B8923A 0%, #E8C97A 50%, #B8923A 100%); }

  /* Metadados do relatório */
  .report-meta { padding: 18px 36px; background: #F5F1E8; border-bottom: 1px solid #e0d8cc; display: flex; justify-content: space-between; align-items: center; }
  .report-title { font-family: Georgia, serif; font-size: 16px; color: #0A0A0A; font-weight: normal; }
  .report-period { font-size: 11px; color: #4A4A4A; }
  .report-obra { font-size: 11px; color: #B8923A; font-weight: 600; margin-top: 2px; }

  /* Conteúdo */
  .content { padding: 24px 36px; }
  .section-title { font-family: Georgia, serif; font-size: 13px; font-weight: normal; color: #0A0A0A; text-transform: uppercase; letter-spacing: 2px; margin: 24px 0 8px; padding-bottom: 6px; border-bottom: 1.5px solid #B8923A; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  thead tr { background: #0A0A0A; }
  thead th { padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #F5F1E8; border: none; }
  thead th.right { text-align: right; }
  tbody tr { border-bottom: 1px solid #ece8e0; }
  tbody td { font-size: 12px; color: #1a1a1a; border: none; }
  .table-count { font-size: 10px; color: #888; text-align: right; margin-bottom: 4px; }

  /* Resumo financeiro */
  .summary { background: #0A0A0A; color: #F5F1E8; border-radius: 4px; overflow: hidden; margin-top: 24px; }
  .summary-title { padding: 12px 20px; font-family: Georgia, serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #B8923A; border-bottom: 1px solid #222; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .summary-item { padding: 14px 20px; border-bottom: 1px solid #1a1a1a; }
  .summary-item:nth-child(even) { border-left: 1px solid #1a1a1a; }
  .summary-label { font-size: 10px; color: #888; letter-spacing: .5px; text-transform: uppercase; margin-bottom: 4px; }
  .summary-value { font-size: 16px; font-weight: 700; }
  .summary-total { padding: 16px 20px; border-top: 2px solid #B8923A; display: flex; justify-content: space-between; align-items: center; }
  .summary-total-label { font-size: 11px; color: #aaa; letter-spacing: 1px; text-transform: uppercase; }
  .summary-total-value { font-family: Georgia, serif; font-size: 20px; font-weight: 700; }
  .pos { color: #4ade80; }
  .neg { color: #f87171; }
  .neutral { color: #F5F1E8; }

  /* Rodapé */
  .footer { margin-top: 32px; padding: 16px 36px; border-top: 1px solid #e0d8cc; display: flex; justify-content: space-between; align-items: center; }
  .footer-brand { font-family: Georgia, serif; font-size: 10px; letter-spacing: 3px; color: #B8923A; text-transform: uppercase; }
  .footer-meta { font-size: 10px; color: #aaa; text-align: right; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header { -webkit-print-color-adjust: exact; }
    .summary { -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body>

<!-- Cabeçalho Altor -->
<div class="header">
  <div class="header-left">
    <svg class="logo-mark" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M28 6 L50 50 H6 Z" fill="none" stroke="#B8923A" stroke-width="2.5" stroke-linejoin="round"/>
      <line x1="16.5" y1="37" x2="39.5" y2="37" stroke="#B8923A" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
    <div>
      <div class="brand-name">Altor</div>
      <div class="brand-sub">Construtora e Incorporadora</div>
    </div>
  </div>
  <div class="header-right">
    <div>Relatório Financeiro</div>
    <div>${tipoLabel[tipoAtual]}</div>
    <div>${geradoEm}</div>
  </div>
</div>
<div class="gold-rule"></div>

<!-- Metadados -->
<div class="report-meta">
  <div>
    <div class="report-title">Relatório ${tipoLabel[tipoAtual]} de Contas</div>
    <div class="report-obra">${obraLabel}</div>
  </div>
  <div class="report-period">
    Período: ${fmtDate(periodoInicio)} a ${fmtDate(periodoFim)}
  </div>
</div>

<div class="content">

  <!-- Contas a Receber -->
  <div class="section-title">Contas a Receber</div>
  <div class="table-count">${crRows.length} lançamento(s)</div>
  <table>
    <thead>
      <tr>
        <th>Descrição</th>
        <th>Vencimento</th>
        <th class="right">Valor</th>
        <th class="right">Recebido</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${crHtml}</tbody>
  </table>

  <!-- Contas a Pagar -->
  <div class="section-title">Contas a Pagar</div>
  <div class="table-count">${cpRows.length} lançamento(s)</div>
  <table>
    <thead>
      <tr>
        <th>Descrição</th>
        <th>Categoria</th>
        <th>Vencimento</th>
        <th class="right">Valor</th>
        <th class="right">Pago</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${cpHtml}</tbody>
  </table>

  <!-- Resumo financeiro -->
  <div class="summary">
    <div class="summary-title">Resumo do Período</div>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-label">A receber (total)</div>
        <div class="summary-value neutral">${fmtBRL(totalCROriginal)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Recebido</div>
        <div class="summary-value pos">${fmtBRL(totalCRPago)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">A pagar (total)</div>
        <div class="summary-value neutral">${fmtBRL(totalCPOriginal)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Pago</div>
        <div class="summary-value neg">${fmtBRL(totalCPPago)}</div>
      </div>
    </div>
    <div class="summary-total">
      <div class="summary-total-label">Resultado do período</div>
      <div class="summary-total-value ${saldo >= 0 ? 'pos' : 'neg'}">${fmtBRL(saldo)}</div>
    </div>
  </div>

</div>

<!-- Rodapé -->
<div class="footer">
  <div class="footer-brand">Altor — Construtora e Incorporadora</div>
  <div class="footer-meta">Documento gerado em ${geradoEm}<br>Uso interno — confidencial</div>
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

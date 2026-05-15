'use client';

import { useState } from 'react';
import type { Empreendimento } from '@/types/db';

export function RelatoriosClient({
  empreendimentos,
}: {
  empreendimentos: Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[];
}) {
  const [obra, setObra] = useState('');
  const [tipo, setTipo] = useState<'SEMANAL' | 'QUINZENAL' | 'MENSAL'>('MENSAL');

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="card space-y-4">
        <div>
          <label className="label">Empreendimento</label>
          <select
            className="input"
            value={obra}
            onChange={(e) => setObra(e.target.value)}
          >
            <option value="">Todos</option>
            {empreendimentos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Periodicidade</label>
          <select
            className="input"
            value={tipo}
            onChange={(e) =>
              setTipo(e.target.value as 'SEMANAL' | 'QUINZENAL' | 'MENSAL')
            }
          >
            <option value="SEMANAL">Semanal</option>
            <option value="QUINZENAL">Quinzenal</option>
            <option value="MENSAL">Mensal</option>
          </select>
        </div>

        <div className="text-sm text-text-dim">
          Geração de PDF (financeiro + cronograma + medições + compras) será
          habilitada em breve. Por ora, use os módulos individuais com filtros
          para conferir dados.
        </div>

        <button
          type="button"
          className="btn-primary"
          disabled
          title="Em breve"
        >
          Gerar PDF (em breve)
        </button>
      </div>
    </div>
  );
}

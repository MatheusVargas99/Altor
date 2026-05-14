export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-text">Dashboard</h1>
        <p className="text-text-dim text-sm">
          Visão geral físico-financeira da Altor.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Empreendimentos ativos', value: '—' },
          { label: 'A receber (30d)', value: '—' },
          { label: 'A pagar (30d)', value: '—' },
          { label: 'Saldo previsto', value: '—' },
        ].map((kpi) => (
          <div key={kpi.label} className="card">
            <div className="text-xs text-text-dim uppercase tracking-wide">
              {kpi.label}
            </div>
            <div className="text-2xl font-semibold text-primary mt-2">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-lg font-medium mb-2">Bem-vindo</h2>
        <p className="text-sm text-text-dim">
          Migração em andamento. Schemas e módulos serão habilitados conforme
          forem implementados.
        </p>
      </div>
    </div>
  );
}

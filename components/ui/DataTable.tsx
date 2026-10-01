'use client';

import { useMemo, useState } from 'react';

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  cell: (row: T) => React.ReactNode;
  sortAccessor?: (row: T) => string | number | null;
  searchAccessor?: (row: T) => string;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  onRowClick,
  emptyText = 'Nenhum registro.',
  searchPlaceholder = 'Buscar…',
}: {
  rows: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  emptyText?: string;
  searchPlaceholder?: string;
}) {
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      columns.some((c) => {
        const v = c.searchAccessor ? c.searchAccessor(r) : '';
        return v.toLowerCase().includes(needle);
      }),
    );
  }, [rows, columns, q]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortAccessor) return filtered;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.sortAccessor!(a);
      const bv = col.sortAccessor!(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filtered, sortKey, sortDir, columns]);

  return (
    <div className="space-y-3">
      <input
        type="search"
        enterKeyHint="search"
        className="input sm:max-w-sm"
        placeholder={searchPlaceholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {/* Celular: cada linha vira um cartão (primeira coluna = título, ações no rodapé) */}
      <div className="space-y-2 md:hidden">
        {sorted.length === 0 ? (
          <div className="rounded-lg border border-border px-3 py-6 text-center text-sm text-text-dim">
            {emptyText}
          </div>
        ) : (
          sorted.map((row) => {
            const [first, ...rest] = columns;
            const campos = rest.filter((c) => c.header);
            const acoes = rest.filter((c) => !c.header);
            return (
              <div
                key={row.id}
                className={`rounded-lg border border-border bg-bg-2 p-3 text-sm ${
                  onRowClick ? 'cursor-pointer active:bg-bg-3' : ''
                }`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {first && <div className="mb-2 font-medium text-text break-words [&_a]:block [&_a]:py-1.5">{first.cell(row)}</div>}
                {campos.length > 0 && (
                  <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5">
                    {campos.map((c) => (
                      <div key={c.key} className="contents">
                        <dt className="text-xs text-text-dim pt-0.5">{c.header}</dt>
                        <dd className="min-w-0 text-right break-words">{c.cell(row)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {acoes.map((c) => (
                  <div key={c.key} className="dt-card-acoes mt-2 border-t border-border pt-2">
                    {c.cell(row)}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full text-sm">
          <thead className="bg-bg-3 text-text-dim">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-3 py-2 text-left font-medium ${c.className ?? ''} ${
                    c.sortAccessor ? 'cursor-pointer select-none' : ''
                  }`}
                  onClick={() => {
                    if (!c.sortAccessor) return;
                    if (sortKey === c.key) {
                      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                    } else {
                      setSortKey(c.key);
                      setSortDir('asc');
                    }
                  }}
                >
                  {c.header}
                  {sortKey === c.key && (
                    <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-6 text-center text-text-dim"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr
                  key={row.id}
                  className={`border-t border-border ${
                    onRowClick ? 'cursor-pointer hover:bg-bg-3' : ''
                  }`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-3 py-2 ${c.className ?? ''}`}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-text-dim">
        {sorted.length} de {rows.length} registro(s)
      </div>
    </div>
  );
}

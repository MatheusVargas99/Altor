'use client';

import { memo, useEffect, useMemo, useState } from 'react';

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  cell: (row: T) => React.ReactNode;
  sortAccessor?: (row: T) => string | number | null;
  searchAccessor?: (row: T) => string;
};

function useDebounced<T>(value: T, delay = 150): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function TableRowInner<T extends { id: string }>({
  row,
  columns,
  onRowClick,
}: {
  row: T;
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
}) {
  return (
    <tr
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
  );
}
const TableRow = memo(TableRowInner) as typeof TableRowInner;

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
  const dq = useDebounced(q, 150);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Pre-compute the searchable string for each row once per (rows, columns) change.
  // Avoids re-running every searchAccessor on every keystroke.
  const searchIndex = useMemo(() => {
    const idx = new Map<string, string>();
    for (const r of rows) {
      let acc = '';
      for (const c of columns) {
        if (c.searchAccessor) {
          const v = c.searchAccessor(r);
          if (v) acc += ' ' + v.toLowerCase();
        }
      }
      idx.set(r.id, acc);
    }
    return idx;
  }, [rows, columns]);

  const filtered = useMemo(() => {
    const needle = dq.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => (searchIndex.get(r.id) ?? '').includes(needle));
  }, [rows, dq, searchIndex]);

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
        className="input max-w-sm"
        placeholder={searchPlaceholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="overflow-x-auto rounded-lg border border-border">
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
                <TableRow
                  key={row.id}
                  row={row}
                  columns={columns}
                  onRowClick={onRowClick}
                />
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

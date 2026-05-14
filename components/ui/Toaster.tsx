'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type Toast = { id: number; kind: 'success' | 'error' | 'info'; text: string };

const ToastCtx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, ...t }]);
    setTimeout(() => {
      setItems((xs) => xs.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={
              'rounded-md px-4 py-3 text-sm shadow-lg border ' +
              (t.kind === 'success'
                ? 'bg-success/20 border-success text-success'
                : t.kind === 'error'
                  ? 'bg-danger/20 border-danger text-danger'
                  : 'bg-info/20 border-info text-info')
            }
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

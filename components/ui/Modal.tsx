'use client';

import { useEffect } from 'react';

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    // Trava o scroll do fundo — no iOS o body rola por trás do modal
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const w =
    size === 'sm'
      ? 'sm:max-w-md'
      : size === 'lg'
        ? 'sm:max-w-3xl'
        : size === 'xl'
          ? 'sm:max-w-5xl'
          : 'sm:max-w-xl';

  // Celular: folha em tela cheia com cabeçalho fixo e corpo rolável.
  // A partir de `sm`: janela centralizada como antes.
  return (
    <div
      className="fixed inset-0 z-40 flex items-stretch justify-center bg-black/60 sm:items-start sm:overflow-y-auto sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex h-[100dvh] w-full max-w-full flex-col bg-bg-2 shadow-xl sm:mt-10 sm:h-auto ${w} sm:rounded-lg sm:border sm:border-border`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pt-3">
          <h2 className="min-w-0 truncate text-lg font-medium text-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-text-dim hover:text-text sm:h-8 sm:w-8"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-none sm:overflow-visible sm:p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

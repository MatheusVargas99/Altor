/// <reference types="react-dom/canary" />
'use client';

import { useFormStatus } from 'react-dom';

// No celular a rede é lenta: trava o botão durante o envio para evitar toques repetidos
export function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-primary min-h-[44px] w-full"
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? 'Entrando…' : 'Entrar'}
    </button>
  );
}

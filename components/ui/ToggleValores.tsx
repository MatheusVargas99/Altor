'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export const VALORES_OCULTOS_KEY = 'altor:valores-ocultos';
const CLASSE = 'valores-ocultos';

/**
 * Botão que oculta (borra) todos os elementos marcados com `valor-sensivel`.
 * O estado vive numa classe no <html> + localStorage, então sobrevive a
 * recarregamentos e é aplicado antes da pintura pelo script de boot da página.
 */
export function ToggleValores() {
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    setOculto(document.documentElement.classList.contains(CLASSE));
  }, []);

  const alternar = () => {
    const novo = !oculto;
    setOculto(novo);
    document.documentElement.classList.toggle(CLASSE, novo);
    try {
      localStorage.setItem(VALORES_OCULTOS_KEY, novo ? '1' : '0');
    } catch {
      /* localStorage indisponível — o toggle segue valendo para a sessão */
    }
  };

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={oculto}
      title={oculto ? 'Mostrar os valores do dashboard' : 'Ocultar os valores do dashboard'}
      className="btn-ghost gap-2 text-sm"
    >
      {oculto ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      {oculto ? 'Mostrar dados' : 'Ocultar dados'}
    </button>
  );
}

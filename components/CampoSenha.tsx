'use client';

import { useState } from 'react';
import { IconeOlho, IconeOlhoFechado } from '@/components/icones';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

/** Campo de senha com botão para alternar a visibilidade do texto digitado. */
export function CampoSenha({ className, ...props }: Props) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="campo-senha">
      <input
        {...props}
        type={visivel ? 'text' : 'password'}
        className={`entrada ${className ?? ''}`.trim()}
      />
      <button
        type="button"
        className="campo-senha-olho"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        tabIndex={-1}
      >
        {visivel ? <IconeOlhoFechado size={18} /> : <IconeOlho size={18} />}
      </button>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { IconeMaisTres } from '@/components/icones';

export type AcaoMenu = {
  rotulo: string;
  aoEscolher: () => void;
  perigo?: boolean;
  /** Linha separadora antes desta ação. */
  separar?: boolean;
};

/** Botão "..." com um menu suspenso de ações. */
export function MenuAcoes({
  acoes,
  rotulo,
  desabilitado = false,
}: {
  acoes: AcaoMenu[];
  rotulo: string;
  desabilitado?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: Event) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('pointerdown', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  if (acoes.length === 0) return null;

  return (
    // O clique não pode vazar: o menu mora dentro de cartões clicáveis.
    <div className="menu-acoes" ref={caixa} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="menu-acoes-botao"
        aria-label={rotulo}
        aria-haspopup="menu"
        aria-expanded={aberto}
        disabled={desabilitado}
        onClick={() => setAberto((a) => !a)}
      >
        <IconeMaisTres size={20} />
      </button>
      {aberto && (
        <div className="menu-acoes-lista" role="menu">
          {acoes.map((a) => (
            <button
              key={a.rotulo}
              type="button"
              role="menuitem"
              className={`menu-acoes-item${a.perigo ? ' perigo' : ''}${a.separar ? ' separar' : ''}`}
              onClick={() => { setAberto(false); a.aoEscolher(); }}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { IconeCalendario, IconeDireita } from '@/components/icones';
import { formatarDiaCompleto } from '@/lib/datas';
import { PERIODOS, type Intervalo, type PeriodoId } from '@/lib/painel';

/**
 * Seletor de período: atalhos de um clique e, para quem precisa de outro
 * recorte, duas datas escolhidas à mão.
 */
export function SeletorPeriodo({
  periodo,
  personalizado,
  intervalo,
  hoje,
  aoMudar,
}: {
  periodo: PeriodoId;
  personalizado: Intervalo | null;
  /** Intervalo já resolvido, para rotular o botão. */
  intervalo: Intervalo | null;
  hoje: string;
  aoMudar: (periodo: PeriodoId, personalizado: Intervalo | null) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<Intervalo>(
    personalizado ?? intervalo ?? { de: hoje, ate: hoje },
  );
  const caixa = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora ou apertar Esc, como qualquer menu suspenso.
  useEffect(() => {
    if (!aberto) return;
    const noClique = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    const naTecla = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('mousedown', noClique);
    document.addEventListener('keydown', naTecla);
    return () => {
      document.removeEventListener('mousedown', noClique);
      document.removeEventListener('keydown', naTecla);
    };
  }, [aberto]);

  const rotulo =
    periodo === 'personalizado' && intervalo
      ? `${formatarDiaCompleto(intervalo.de)} — ${formatarDiaCompleto(intervalo.ate)}`
      : PERIODOS.find((p) => p.id === periodo)?.rotulo ?? 'Período';

  function escolherAtalho(id: PeriodoId) {
    aoMudar(id, null);
    setAberto(false);
  }

  function aplicarPersonalizado() {
    // Datas invertidas: troca em vez de recusar, que é o que a pessoa quis dizer.
    const de = rascunho.de <= rascunho.ate ? rascunho.de : rascunho.ate;
    const ate = rascunho.de <= rascunho.ate ? rascunho.ate : rascunho.de;
    aoMudar('personalizado', { de, ate });
    setAberto(false);
  }

  return (
    <div className="seletor-periodo" ref={caixa}>
      <button
        type="button"
        className={`periodo-botao${aberto ? ' aberto' : ''}`}
        onClick={() => setAberto((a) => !a)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
      >
        <IconeCalendario size={17} />
        <span className="periodo-rotulo">{rotulo}</span>
        <IconeDireita size={15} className="periodo-seta" />
      </button>

      {aberto && (
        <div className="periodo-menu" role="dialog" aria-label="Escolher período">
          <div className="periodo-atalhos">
            {PERIODOS.filter((p) => p.id !== 'personalizado').map((p) => (
              <button
                key={p.id}
                type="button"
                className={`periodo-atalho${periodo === p.id ? ' ativo' : ''}`}
                onClick={() => escolherAtalho(p.id)}
              >
                {p.rotulo}
              </button>
            ))}
          </div>

          <div className="periodo-divisor" />

          <div className="periodo-custom">
            <div className="periodo-custom-titulo">Período personalizado</div>
            <div className="periodo-campos">
              <label>
                <span className="rotulo">De</span>
                <input
                  type="date"
                  className="entrada"
                  value={rascunho.de}
                  max={rascunho.ate || undefined}
                  onChange={(e) => setRascunho((r) => ({ ...r, de: e.target.value }))}
                />
              </label>
              <label>
                <span className="rotulo">Até</span>
                <input
                  type="date"
                  className="entrada"
                  value={rascunho.ate}
                  min={rascunho.de || undefined}
                  onChange={(e) => setRascunho((r) => ({ ...r, ate: e.target.value }))}
                />
              </label>
            </div>
            <button
              type="button"
              className="btn btn-primario btn-bloco btn-pequeno"
              disabled={!rascunho.de || !rascunho.ate}
              onClick={aplicarPersonalizado}
            >
              Aplicar período
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

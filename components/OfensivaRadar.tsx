'use client';

import { useEffect, useRef, useState } from 'react';
import { IconeChama, IconeDireita, IconeFoguete, IconeX } from '@/components/icones';
import { proximoMarco, rotuloOfensiva, type Ofensiva } from '@/lib/ofensiva';
import { diaParaDate } from '@/lib/datas';

/** Inicial do dia da semana, para a tira dos últimos dias. */
function letraDoDia(dia: string): string {
  return ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][diaParaDate(dia).getUTCDay()];
}

/**
 * Ofensiva Radar: dias úteis seguidos trabalhando no produto.
 *
 * Aparece ao lado do botão de nova demanda. Clicar abre o detalhe com a tira
 * da semana, o recorde e o próximo marco.
 */
export function OfensivaRadar({ ofensiva }: { ofensiva: Ofensiva | null }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora ou com Esc, como os outros menus do app.
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

  // Enquanto não carregou, não ocupa espaço nem pisca um valor errado.
  if (!ofensiva) return null;

  const marco = proximoMarco(ofensiva.atual);
  const faltam = marco === null ? 0 : marco - ofensiva.atual;

  return (
    <div className="ofensiva" ref={caixa}>
      <button
        type="button"
        className={`ofensiva-selo${aberto ? ' aberto' : ''}${ofensiva.atual === 0 ? ' apagada' : ''}`}
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
      >
        <IconeFoguete size={34} />
        <span className="ofensiva-texto">
          <span className="ofensiva-titulo">Ofensiva Radar</span>
          <span className="ofensiva-sub">{rotuloOfensiva(ofensiva)}</span>
        </span>
        <IconeDireita size={15} className="ofensiva-seta" />
      </button>

      {aberto && (
        <div className="ofensiva-painel" role="dialog" aria-label="Detalhe da Ofensiva Radar">
          <div className="ofensiva-painel-topo">
            <div>
              <div className="ofensiva-painel-titulo">Ofensiva Radar</div>
              <p className="ofensiva-painel-sub">
                Dias úteis seguidos com trabalho no Radar.
              </p>
            </div>
            <button
              type="button" className="btn-icone"
              onClick={() => setAberto(false)} aria-label="Fechar"
            >
              <IconeX size={17} />
            </button>
          </div>

          <div className="ofensiva-numeros">
            <div className="ofensiva-numero">
              <span className="ofensiva-numero-icone"><IconeChama size={18} /></span>
              <div>
                <div className="ofensiva-numero-valor">{ofensiva.atual}</div>
                <div className="ofensiva-numero-rotulo">em sequência</div>
              </div>
            </div>
            <div className="ofensiva-numero">
              <div>
                <div className="ofensiva-numero-valor">{ofensiva.recorde}</div>
                <div className="ofensiva-numero-rotulo">seu recorde</div>
              </div>
            </div>
            <div className="ofensiva-numero">
              <div>
                <div className="ofensiva-numero-valor">{ofensiva.totalDias}</div>
                <div className="ofensiva-numero-rotulo">dias no total</div>
              </div>
            </div>
          </div>

          {/* Tira dos últimos dias úteis: onde houve trabalho e onde faltou. */}
          <div className="ofensiva-tira">
            {ofensiva.ultimos.map((u) => (
              <span
                key={u.dia}
                className={`ofensiva-dia${u.ativo ? ' ativo' : ''}`}
                title={u.dia.split('-').reverse().join('/')}
              >
                <span className="ofensiva-dia-letra">{letraDoDia(u.dia)}</span>
                <span className="ofensiva-dia-marca">{u.ativo ? '✓' : ''}</span>
              </span>
            ))}
          </div>

          <p className="ofensiva-nota">
            {ofensiva.hojeConta ? (
              <>Hoje já conta. {marco !== null && (
                <>Faltam <strong>{faltam}</strong> {faltam === 1 ? 'dia' : 'dias'} para {marco}.</>
              )}</>
            ) : ofensiva.atual > 0 ? (
              <>Trabalhe hoje para manter a sequência de <strong>{ofensiva.atual}</strong>{' '}
                {ofensiva.atual === 1 ? 'dia' : 'dias'}.</>
            ) : (
              <>Crie, edite ou comente uma demanda para começar sua ofensiva.</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

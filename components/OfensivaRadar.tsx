'use client';

import { useEffect } from 'react';
import {
  IconeAlvo, IconeBarrinhas, IconeCheck, IconeDireita, IconeFoguete,
  IconeTrofeu, IconeX,
} from '@/components/icones';
import {
  mensagemDeRitmo, metaAtual, rotuloOfensiva, type Ofensiva,
} from '@/lib/ofensiva';
import { diaParaDate } from '@/lib/datas';

/** Selo ao lado de "Nova demanda". Clicar abre a gaveta com o detalhe. */
export function SeloOfensiva({
  ofensiva,
  pulsando,
  aoAbrir,
}: {
  ofensiva: Ofensiva | null;
  /** Anima quando o dia acabou de entrar na contagem. */
  pulsando: boolean;
  aoAbrir: () => void;
}) {
  if (!ofensiva) return null;

  return (
    <button
      type="button"
      className={`ofensiva-selo${ofensiva.atual === 0 ? ' apagada' : ''}${pulsando ? ' comemorando' : ''}`}
      onClick={aoAbrir}
      aria-haspopup="dialog"
    >
      <span className="ofensiva-foguete"><IconeFoguete size={34} /></span>
      <span className="ofensiva-texto">
        <span className="ofensiva-titulo">Ofensiva Radar</span>
        <span className="ofensiva-sub">{rotuloOfensiva(ofensiva)}</span>
      </span>
      <IconeDireita size={15} className="ofensiva-seta" />
    </button>
  );
}

/** Gaveta lateral com o detalhe da ofensiva. */
export function GavetaOfensiva({
  ofensiva,
  aoFechar,
}: {
  ofensiva: Ofensiva;
  aoFechar: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aoFechar]);

  const meta = metaAtual(ofensiva.atual);
  const faltam = Math.max(0, meta - ofensiva.atual);
  const progresso = Math.min(100, (ofensiva.atual / meta) * 100);

  return (
    <>
      <div className="veu" onClick={aoFechar} />
      <aside className="gaveta gaveta-ofensiva" role="dialog" aria-label="Ofensiva Radar">
        <div className="of-topo">
          <button className="btn-icone of-fechar" onClick={aoFechar} aria-label="Fechar">
            <IconeX size={20} />
          </button>
          <div className="of-marca">
            <IconeFoguete size={80} />
            <div>
              <h2 className="of-titulo">Ofensiva Radar</h2>
              <p className="of-sub">Disciplina hoje, grandes resultados amanhã.</p>
            </div>
          </div>
        </div>

        <div className="of-corpo">
          <div className="of-faixa">
            <span className="of-faixa-icone"><IconeBarrinhas size={20} /></span>
            <div>
              <div className="of-faixa-titulo">{rotuloOfensiva(ofensiva)}</div>
              <p className="of-faixa-texto">{mensagemDeRitmo(ofensiva.atual)}</p>
            </div>
          </div>

          {/* Trilha dos dias: de onde a sequência vem e o próximo a cumprir. */}
          <div className="of-trilha">
            {ofensiva.ultimos.map((u, i) => (
              <div className="of-passo" key={u.dia}>
                {i > 0 && <span className="of-linha" aria-hidden="true" />}
                <span
                  className={`of-bola${u.ativo ? ' feito' : ''}${u.ehHoje ? ' hoje' : ''}${u.futuro ? ' futuro' : ''}`}
                >
                  {u.ativo && <IconeCheck size={17} />}
                </span>
                <span className={`of-passo-rotulo${u.ehHoje ? ' hoje' : ''}`}>
                  {u.ehHoje ? 'Hoje' : Number(u.dia.slice(8, 10))}
                </span>
              </div>
            ))}
          </div>

          <p className="of-nota-trilha">
            Quanto mais você usa o Radar, maior a sua consistência na ofensiva!
          </p>

          <div className="of-cartao">
            <div className="of-cartao-topo">
              <span className="of-cartao-icone"><IconeBarrinhas size={19} /></span>
              <span className="of-cartao-titulo">Sua sequência</span>
            </div>
            <div className="of-numeros">
              <div>
                <div className="of-numero">{ofensiva.atual}</div>
                <div className="of-numero-rotulo">dias no ritmo</div>
              </div>
              <div>
                <div className="of-numero">{ofensiva.recorde}</div>
                <div className="of-numero-rotulo">seu recorde</div>
              </div>
              <div>
                <div className="of-numero">{meta}</div>
                <div className="of-numero-rotulo">sua meta atual</div>
              </div>
            </div>
          </div>

          <div className="of-cartao">
            <div className="of-cartao-topo">
              <span className="of-cartao-icone"><IconeAlvo size={19} /></span>
              <div>
                <div className="of-cartao-titulo">Meta da ofensiva</div>
                <p className="of-cartao-desc">Usar o Radar por {meta} dias consecutivos.</p>
              </div>
            </div>

            <div className="of-progresso">
              <span className="of-progresso-trilho">
                <span className="of-progresso-barra" style={{ width: `${progresso}%` }} />
              </span>
              <span className="of-progresso-valor">{ofensiva.atual}/{meta}</span>
            </div>

            <div className="of-aviso">
              <IconeTrofeu size={18} />
              <span>
                {faltam === 0
                  ? 'Meta batida! Uma nova já começou.'
                  : `Faltam apenas ${faltam} ${faltam === 1 ? 'dia' : 'dias'} para você completar a meta!`}
              </span>
            </div>
          </div>
        </div>

        <div className="of-rodape">
          <IconeFoguete size={30} />
          <div>
            <div className="of-rodape-titulo">
              {ofensiva.hojeConta ? 'Continue no ritmo!' : 'Sua vez hoje'}
            </div>
            <p className="of-rodape-texto">
              {ofensiva.hojeConta
                ? 'A consistência de hoje constrói o seu resultado de amanhã.'
                : 'Crie, edite ou comente uma demanda para somar o dia de hoje.'}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

/** Aviso que sobe quando o dia entra na contagem. */
export function BrindeOfensiva({ dias }: { dias: number }) {
  return (
    <div className="of-brinde" role="status">
      <span className="of-brinde-foguete"><IconeFoguete size={34} /></span>
      <div>
        <div className="of-brinde-titulo">Dia somado à ofensiva!</div>
        <div className="of-brinde-texto">
          {dias === 1 ? 'Primeiro dia no ritmo.' : `${dias} dias no ritmo.`}
        </div>
      </div>
    </div>
  );
}

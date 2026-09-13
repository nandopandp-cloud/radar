'use client';

import { useEffect, useMemo } from 'react';
import {
  IconeAlvo, IconeBarrinhas, IconeCheck, IconeDireita, IconeFoguete,
  IconeFogueteVertical, IconeTrofeu, IconeX,
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

/** Quantas peças de confete caem na comemoração. */
const PECAS_CONFETE = 26;

/** Confete gerado uma vez por montagem, com trajetórias variadas. */
function pecasDeConfete() {
  const cores = ['#2563eb', '#60a5fa', '#93c5fd', '#3b82f6', '#bfdbfe'];
  return Array.from({ length: PECAS_CONFETE }, (_, i) => ({
    id: i,
    /* Espalha na horizontal e varia atraso, giro e duração para o
       movimento não parecer um bloco só caindo. */
    esquerda: 4 + (i * 92) / PECAS_CONFETE + (i % 3) * 2,
    atraso: (i % 7) * 0.11,
    duracao: 2.4 + (i % 5) * 0.35,
    giro: (i % 2 === 0 ? 1 : -1) * (180 + (i % 4) * 140),
    cor: cores[i % cores.length],
    // Metade vira fita, metade quadrado — variedade sem precisar de imagem.
    fita: i % 2 === 0,
    escala: 0.75 + (i % 4) * 0.18,
  }));
}

/**
 * Comemoração do dia somado: modal com foguete decolando e confete.
 *
 * Aparece uma vez por dia, na primeira ação que conta para a ofensiva.
 */
export function ModalOfensiva({
  dias,
  meta,
  aoFechar,
}: {
  dias: number;
  meta: number;
  aoFechar: () => void;
}) {
  const confete = useMemo(pecasDeConfete, []);
  const primeiroDia = dias === 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aoFechar]);

  /* A trilha mostra uma bolinha por dia da meta. Em metas longas vira
     um traço só, então acima de 15 dias mostramos os últimos 15. */
  const bolinhas = Math.min(meta, 15);
  const deslocamento = Math.max(0, dias - bolinhas);

  return (
    <>
      <div className="veu veu-festa" onClick={aoFechar} />
      <div className="festa" role="dialog" aria-modal="true" aria-label="Ofensiva Radar">
        <div className="festa-confete" aria-hidden="true">
          {confete.map((c) => (
            <span
              key={c.id}
              className={`confete${c.fita ? ' fita' : ''}`}
              style={{
                left: `${c.esquerda}%`,
                background: c.cor,
                animationDelay: `${c.atraso}s`,
                animationDuration: `${c.duracao}s`,
                ['--giro' as string]: `${c.giro}deg`,
                ['--escala' as string]: c.escala,
              }}
            />
          ))}
        </div>

        <div className="festa-caixa">
          <button className="btn-icone festa-fechar" onClick={aoFechar} aria-label="Fechar">
            <IconeX size={20} />
          </button>

          {/* O foguete sai por cima da caixa, como nas referências. */}
          <div className="festa-palco" aria-hidden="true">
            <span className="festa-brilho" />
            <span className="festa-foguete"><IconeFogueteVertical size={150} /></span>
            <span className="festa-faisca f1" />
            <span className="festa-faisca f2" />
            <span className="festa-faisca f3" />
          </div>

          <div className="festa-corpo">
            <h2 className="festa-titulo">
              {primeiroDia ? (
                <>Ofensiva Radar<br /><span className="festa-destaque">começou hoje!</span></>
              ) : (
                <>Mais um dia de<br /><span className="festa-destaque">Ofensiva Radar!</span></>
              )}
            </h2>
            <p className="festa-sub">
              {primeiroDia ? (
                <>Vamos juntos por {meta} dias de consistência.</>
              ) : (
                <>Você completou <strong>{dias} dias</strong> no ritmo.</>
              )}
            </p>

            <div className="festa-trilha">
              <div className={`festa-bolinhas${primeiroDia ? ' miudas' : ''}`}>
                {Array.from({ length: bolinhas }, (_, i) => {
                  const diaDaBolinha = deslocamento + i + 1;
                  const feito = diaDaBolinha <= dias;
                  return (
                    <span
                      key={i}
                      className={`festa-bolinha${feito ? ' feita' : ''}`}
                      style={{ animationDelay: `${0.35 + i * 0.055}s` }}
                    >
                      {feito && !primeiroDia && <IconeCheck size={13} />}
                    </span>
                  );
                })}
              </div>
              {primeiroDia ? (
                <div className="festa-trilha-pontas">
                  <span>Dia 1</span><span>Dia {meta}</span>
                </div>
              ) : (
                <span className="festa-contagem">{dias}/{meta} dias</span>
              )}
            </div>

            <div className="festa-dica">
              <IconeBarrinhas size={20} />
              <p>
                {primeiroDia
                  ? <>Pequenas ações diárias<br />geram grandes resultados.</>
                  : <>Consistência hoje,<br />grandes resultados amanhã.</>}
              </p>
            </div>

            <button className="btn btn-primario festa-botao" onClick={aoFechar}>
              {primeiroDia ? 'Bora pra cima!' : 'Continuar'} <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

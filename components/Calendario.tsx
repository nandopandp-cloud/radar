'use client';

import { useMemo } from 'react';
import { COR_SITUACAO, PESO_SITUACAO, situacaoDe, type Situacao } from '@/lib/dominio';
import { diaParaDate, somarDias } from '@/lib/datas';
import { IconeDireita, IconeEsquerda } from '@/components/icones';
import type { Demanda } from '@/lib/tipos';

const NOMES_DIA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Todas as células da grade: 6 semanas a partir do domingo anterior ao dia 1. */
function gerarGrade(ano: number, mes: number): string[] {
  const primeiro = new Date(Date.UTC(ano, mes, 1));
  const inicio = somarDias(primeiro.toISOString().slice(0, 10), -primeiro.getUTCDay());
  return Array.from({ length: 42 }, (_, i) => somarDias(inicio, i));
}

export function Calendario({
  ano,
  mes,
  hoje,
  diaSelecionado,
  demandas,
  aoSelecionar,
  aoMudarMes,
}: {
  ano: number;
  mes: number;
  hoje: string;
  diaSelecionado: string;
  demandas: Demanda[];
  aoSelecionar: (dia: string) => void;
  aoMudarMes: (ano: number, mes: number) => void;
}) {
  const dias = useMemo(() => gerarGrade(ano, mes), [ano, mes]);

  /** Demandas agrupadas por dia de prazo, já com a situação resolvida. */
  const porDia = useMemo(() => {
    const mapa = new Map<string, { d: Demanda; situacao: Situacao }[]>();
    for (const d of demandas) {
      const dia = d.prazo.slice(0, 10);
      const lista = mapa.get(dia) ?? [];
      lista.push({ d, situacao: situacaoDe(d.status, dia, hoje) });
      mapa.set(dia, lista);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => PESO_SITUACAO[a.situacao] - PESO_SITUACAO[b.situacao]);
    }
    return mapa;
  }, [demandas, hoje]);

  const rotuloMes = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(ano, mes, 1)));

  function navegar(delta: number) {
    const d = new Date(Date.UTC(ano, mes + delta, 1));
    aoMudarMes(d.getUTCFullYear(), d.getUTCMonth());
  }

  function irParaHoje() {
    const d = diaParaDate(hoje);
    aoMudarMes(d.getUTCFullYear(), d.getUTCMonth());
    aoSelecionar(hoje);
  }

  return (
    <div className="cartao">
      <div className="cal-topo">
        <button className="cal-nav" onClick={() => navegar(-1)} aria-label="Mês anterior">
          <IconeEsquerda size={17} />
        </button>
        <div className="cal-mes" style={{ textTransform: 'capitalize' }}>{rotuloMes}</div>
        <button className="cal-nav" onClick={() => navegar(1)} aria-label="Próximo mês">
          <IconeDireita size={17} />
        </button>
        <button className="btn btn-secundario btn-hoje" style={{ marginLeft: 'auto' }} onClick={irParaHoje}>
          Hoje
        </button>
      </div>

      <div className="cal-grade">
        <div className="cal-semana">
          {NOMES_DIA.map((n) => (
            <div key={n} className="cal-dia-nome">{n}</div>
          ))}
        </div>

        <div className="cal-corpo">
          {dias.map((dia) => {
            const data = diaParaDate(dia);
            const doMes = data.getUTCMonth() === mes;
            const lista = porDia.get(dia) ?? [];

            // Um ponto por situação presente no dia, com a contagem.
            const contagem = new Map<Situacao, number>();
            for (const { situacao } of lista) {
              contagem.set(situacao, (contagem.get(situacao) ?? 0) + 1);
            }

            return (
              <button
                key={dia}
                className={`cal-celula${doMes ? '' : ' fora'}${dia === diaSelecionado ? ' selecionada' : ''}`}
                onClick={() => aoSelecionar(dia)}
                aria-label={`${data.getUTCDate()} — ${lista.length} demanda(s)`}
              >
                <span className={`cal-numero${dia === hoje ? ' hoje' : ''}`}>
                  {data.getUTCDate()}
                </span>

                {lista.length > 0 && (
                  <>
                    <div className="cal-marcas">
                      {[...contagem.entries()].map(([situacao, n]) => (
                        <span className="marca-ponto" key={situacao}>
                          <span className="ponto" style={{ background: COR_SITUACAO[situacao] }} />
                          {n}
                        </span>
                      ))}
                    </div>
                    <div className="cal-itens">
                      {lista.slice(0, 2).map(({ d, situacao }) => (
                        <span className="cal-item" key={d.id}>
                          <span className="ponto" style={{ background: COR_SITUACAO[situacao] }} />
                          <span className="cal-item-texto">{d.titulo}</span>
                        </span>
                      ))}
                      {lista.length > 2 && (
                        <span className="cal-mais">+{lista.length - 2} demandas</span>
                      )}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>

        <div className="legenda">
          {(['ATRASADA', 'PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA'] as Situacao[]).map((s) => (
            <span className="legenda-item" key={s}>
              <span className="ponto" style={{ background: COR_SITUACAO[s] }} />
              {s === 'ATRASADA' ? 'Atrasada'
                : s === 'PENDENTE' ? 'Pendente'
                : s === 'EM_ANDAMENTO' ? 'Em andamento'
                : 'Concluída'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

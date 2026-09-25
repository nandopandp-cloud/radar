'use client';

import { useMemo } from 'react';
import {
  COR_SITUACAO, PESO_SITUACAO, ROTULO_SITUACAO, situacaoDe, type Situacao,
} from '@/lib/dominio';
import { diaParaDate, somarDias } from '@/lib/datas';
import { IconeCalendarioHoje, IconeDireita, IconeEsquerda } from '@/components/icones';
import type { Demanda } from '@/lib/tipos';

const NOMES_DIA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Situações oferecidas como filtro, na ordem em que aparecem nos chips. */
const FILTROS: Situacao[] = ['PENDENTE', 'ATRASADA', 'CONCLUIDA', 'EM_ANDAMENTO'];

/** Nos chips o rótulo vai no plural, porque acompanha uma contagem. */
const ROTULO_CHIP: Record<Situacao, string> = {
  PENDENTE: 'Em aberto',
  ATRASADA: 'Atrasadas',
  CONCLUIDA: 'Concluídas',
  EM_ANDAMENTO: 'Em andamento',
  CANCELADA: 'Canceladas',
};

/**
 * Células da grade, a partir do domingo anterior ao dia 1. Usa só as semanas
 * que o mês ocupa (5 ou 6), para não sobrar uma linha inteira vazia no fim.
 */
function gerarGrade(ano: number, mes: number): string[] {
  const primeiro = new Date(Date.UTC(ano, mes, 1));
  const inicio = somarDias(primeiro.toISOString().slice(0, 10), -primeiro.getUTCDay());
  const ultimo = new Date(Date.UTC(ano, mes + 1, 0));
  const semanas = Math.ceil((primeiro.getUTCDay() + ultimo.getUTCDate()) / 7);
  return Array.from({ length: semanas * 7 }, (_, i) => somarDias(inicio, i));
}

export function Calendario({
  ano,
  mes,
  hoje,
  diaSelecionado,
  demandas,
  filtro,
  contagem,
  aoFiltrar,
  aoSelecionar,
  aoMudarMes,
}: {
  ano: number;
  mes: number;
  hoje: string;
  diaSelecionado: string;
  demandas: Demanda[];
  /** Situação em foco; `null` mostra todas. */
  filtro: Situacao | null;
  /** Quantas demandas do mês há em cada situação, mais o total. */
  contagem: Record<Situacao, number> & { total: number };
  aoFiltrar: (s: Situacao | null) => void;
  aoSelecionar: (dia: string) => void;
  aoMudarMes: (ano: number, mes: number) => void;
}) {
  const dias = useMemo(() => gerarGrade(ano, mes), [ano, mes]);

  /** Demandas agrupadas por dia de prazo, já com a situação resolvida. */
  const porDia = useMemo(() => {
    const mapa = new Map<string, { d: Demanda; situacao: Situacao }[]>();
    for (const d of demandas) {
      const dia = d.prazo.slice(0, 10);
      const situacao = situacaoDe(d.status, dia, hoje);
      if (filtro && situacao !== filtro) continue;
      const lista = mapa.get(dia) ?? [];
      lista.push({ d, situacao });
      mapa.set(dia, lista);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => PESO_SITUACAO[a.situacao] - PESO_SITUACAO[b.situacao]);
    }
    return mapa;
  }, [demandas, hoje, filtro]);

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
    <div className="cartao cal-cartao">
      <div className="cal-topo">
        <h2 className="cal-mes">{rotuloMes}</h2>
        <div className="cal-setas">
          <button className="cal-nav" onClick={() => navegar(-1)} aria-label="Mês anterior">
            <IconeEsquerda size={17} />
          </button>
          <button className="cal-nav" onClick={() => navegar(1)} aria-label="Próximo mês">
            <IconeDireita size={17} />
          </button>
        </div>
        <button className="btn btn-secundario btn-hoje" onClick={irParaHoje}>
          <IconeCalendarioHoje size={17} /> Hoje
        </button>
      </div>

      {/* Chips de situação: filtram a grade e mostram o tamanho de cada fatia. */}
      <div className="cal-chips" role="group" aria-label="Filtrar por situação">
        <button
          className={`cal-chip${filtro === null ? ' ativo' : ''}`}
          aria-pressed={filtro === null}
          onClick={() => aoFiltrar(null)}
        >
          Todas <span className="cal-chip-conta">{contagem.total}</span>
        </button>
        {FILTROS.map((s) => (
          <button
            key={s}
            className={`cal-chip${filtro === s ? ' ativo' : ''}`}
            aria-pressed={filtro === s}
            onClick={() => aoFiltrar(filtro === s ? null : s)}
          >
            <span className="ponto" style={{ background: COR_SITUACAO[s] }} />
            {ROTULO_CHIP[s]}
            <span className="cal-chip-conta">{contagem[s]}</span>
          </button>
        ))}
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

                {/* Celular: sem espaço para títulos, só pontos e a contagem do resto. */}
                {lista.length > 0 && (
                  <span className="cal-pontos so-celular">
                    {(lista.length <= 3 ? lista : lista.slice(0, 1)).map(({ d, situacao }) => (
                      <span key={d.id} className="ponto" style={{ background: COR_SITUACAO[situacao] }} />
                    ))}
                    {lista.length > 3 && <span className="cal-pontos-mais">+{lista.length - 1}</span>}
                  </span>
                )}

                {lista.length > 0 && (
                  <div className="cal-itens so-desktop">
                    {lista.slice(0, 2).map(({ d, situacao }) => (
                      <span className="cal-item" key={d.id} title={d.titulo}>
                        <span className="ponto" style={{ background: COR_SITUACAO[situacao] }} />
                        <span className="cal-item-texto">{d.titulo}</span>
                      </span>
                    ))}
                    {lista.length > 2 && (
                      <span className="cal-mais">+{lista.length - 2} mais</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="legenda">
          {(['ATRASADA', 'PENDENTE', 'CONCLUIDA', 'EM_ANDAMENTO'] as Situacao[]).map((s) => (
            <span className="legenda-item" key={s}>
              <span className="ponto" style={{ background: COR_SITUACAO[s] }} />
              {ROTULO_SITUACAO[s]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

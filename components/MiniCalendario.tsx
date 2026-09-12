'use client';

import { useMemo } from 'react';
import { COR_SITUACAO, PESO_SITUACAO, situacaoDe, type Situacao } from '@/lib/dominio';
import { diaParaDate, somarDias } from '@/lib/datas';
import { IconeCalendario, IconeDireita } from '@/components/icones';
import type { Demanda } from '@/lib/tipos';

const INICIAIS_DIA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Quantos pontinhos de situação cabem embaixo de um número. */
const MAX_PONTOS = 3;

/** Grade compacta: só as semanas necessárias para cobrir o mês. */
function gerarGrade(ano: number, mes: number): string[] {
  const primeiro = new Date(Date.UTC(ano, mes, 1));
  const inicio = somarDias(primeiro.toISOString().slice(0, 10), -primeiro.getUTCDay());
  const ultimo = new Date(Date.UTC(ano, mes + 1, 0));
  const semanas = Math.ceil((primeiro.getUTCDay() + ultimo.getUTCDate()) / 7);
  return Array.from({ length: semanas * 7 }, (_, i) => somarDias(inicio, i));
}

/**
 * Calendário reduzido do painel lateral: serve de visão geral do mês e de
 * atalho para pular direto num dia, sem tirar o foco da grade principal.
 */
export function MiniCalendario({
  ano,
  mes,
  hoje,
  diaSelecionado,
  demandas,
  aoSelecionar,
  aoIrParaHoje,
}: {
  ano: number;
  mes: number;
  hoje: string;
  diaSelecionado: string;
  demandas: Demanda[];
  aoSelecionar: (dia: string) => void;
  aoIrParaHoje: () => void;
}) {
  const dias = useMemo(() => gerarGrade(ano, mes), [ano, mes]);

  /** Cores das situações presentes em cada dia, da mais grave para a menos. */
  const coresPorDia = useMemo(() => {
    const mapa = new Map<string, Situacao[]>();
    for (const d of demandas) {
      const dia = d.prazo.slice(0, 10);
      const lista = mapa.get(dia) ?? [];
      lista.push(situacaoDe(d.status, dia, hoje));
      mapa.set(dia, lista);
    }
    const resultado = new Map<string, string[]>();
    for (const [dia, lista] of mapa) {
      const unicas = [...new Set(lista)].sort((a, b) => PESO_SITUACAO[a] - PESO_SITUACAO[b]);
      resultado.set(dia, unicas.slice(0, MAX_PONTOS).map((s) => COR_SITUACAO[s]));
    }
    return resultado;
  }, [demandas, hoje]);

  const rotuloMes = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(ano, mes, 1)));

  return (
    <div className="cartao mini-cartao">
      <div className="mini-topo">
        <span className="mini-topo-icone"><IconeCalendario size={17} /></span>
        <span className="mini-mes">{rotuloMes}</span>
        <button className="mini-hoje" onClick={aoIrParaHoje} aria-label="Ir para hoje" title="Ir para hoje">
          <IconeDireita size={15} />
        </button>
      </div>

      <div className="mini-grade">
        {INICIAIS_DIA.map((n, i) => (
          <div key={i} className="mini-nome">{n}</div>
        ))}

        {dias.map((dia) => {
          const data = diaParaDate(dia);
          const doMes = data.getUTCMonth() === mes;
          const cores = coresPorDia.get(dia) ?? [];

          return (
            <button
              key={dia}
              className={`mini-dia${doMes ? '' : ' fora'}${dia === hoje ? ' hoje' : ''}${
                dia === diaSelecionado && dia !== hoje ? ' selecionado' : ''
              }`}
              onClick={() => aoSelecionar(dia)}
              aria-label={`${data.getUTCDate()} — ${cores.length ? 'com demandas' : 'sem demandas'}`}
            >
              <span className="mini-numero">{data.getUTCDate()}</span>
              {cores.length > 0 && (
                <span className="mini-pontos">
                  {cores.map((cor, i) => (
                    <span key={i} className="mini-ponto" style={{ background: cor }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

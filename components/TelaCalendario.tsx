'use client';

import { useMemo } from 'react';
import { Calendario } from '@/components/Calendario';
import { IconeAlerta, IconeCheckCirculo, IconeDocumento, IconeMais, IconeRelogio } from '@/components/icones';
import { situacaoDe } from '@/lib/dominio';
import type { Demanda, SessaoUI } from '@/lib/tipos';

export function TelaCalendario({
  sessao,
  demandas,
  hoje,
  ano,
  mes,
  diaSelecionado,
  aoMudarMes,
  aoSelecionarDia,
  aoAbrirDemanda,
  aoNovaDemanda,
}: {
  sessao: SessaoUI;
  demandas: Demanda[];
  hoje: string;
  ano: number;
  mes: number;
  diaSelecionado: string;
  aoMudarMes: (ano: number, mes: number) => void;
  aoSelecionarDia: (dia: string) => void;
  aoAbrirDemanda: (d: Demanda) => void;
  aoNovaDemanda: (prazo: string) => void;
}) {
  // Resumo considera apenas o mês exibido.
  const resumo = useMemo(() => {
    const doMes = demandas.filter((d) => {
      const p = d.prazo.slice(0, 10);
      const dt = new Date(`${p}T00:00:00Z`);
      return dt.getUTCFullYear() === ano && dt.getUTCMonth() === mes;
    });
    const sit = (d: Demanda) => situacaoDe(d.status, d.prazo.slice(0, 10), hoje);
    return {
      pendentes: doMes.filter((d) => ['PENDENTE', 'EM_ANDAMENTO'].includes(sit(d))).length,
      atrasadas: doMes.filter((d) => sit(d) === 'ATRASADA').length,
      concluidas: doMes.filter((d) => sit(d) === 'CONCLUIDA').length,
      total: doMes.length,
    };
  }, [demandas, ano, mes, hoje]);

  const primeiroNome = sessao.nome.trim().split(/\s+/)[0];

  return (
    <>
      <div className="espalhar" style={{ marginBottom: 22 }}>
        <div>
          <h1 className="saudacao">Olá, {primeiroNome}!</h1>
          <p className="saudacao-sub">
            Organize suas demandas, acompanhe prazos e receba alertas automaticamente.
          </p>
        </div>
        <button className="btn btn-primario" onClick={() => aoNovaDemanda(diaSelecionado)}>
          <IconeMais size={18} /> Nova demanda
        </button>
      </div>

      <div className="pilha">
        <Calendario
          ano={ano}
          mes={mes}
          hoje={hoje}
          diaSelecionado={diaSelecionado}
          demandas={demandas}
          aoSelecionar={aoSelecionarDia}
          aoMudarMes={aoMudarMes}
        />

        <div className="cartao">
            <div className="cartao-cabecalho">
              <div className="cartao-titulo">Resumo do mês</div>
              <span className="texto-suave primeira-maiuscula">
                {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
                  .format(new Date(Date.UTC(ano, mes, 1)))}
              </span>
            </div>
            <div className="resumo-grade">
              <div className="resumo-caixa azul">
                <div className="resumo-valor" style={{ color: 'var(--pendente)' }}>{resumo.pendentes}</div>
                <div className="resumo-rotulo">Demandas pendentes</div>
                <span className="resumo-icone" style={{ color: 'var(--pendente)' }}><IconeRelogio size={19} /></span>
              </div>
              <div className="resumo-caixa vermelho">
                <div className="resumo-valor" style={{ color: 'var(--atrasada)' }}>{resumo.atrasadas}</div>
                <div className="resumo-rotulo">Demandas atrasadas</div>
                <span className="resumo-icone" style={{ color: 'var(--atrasada)' }}><IconeAlerta size={19} /></span>
              </div>
              <div className="resumo-caixa verde">
                <div className="resumo-valor" style={{ color: 'var(--concluida)' }}>{resumo.concluidas}</div>
                <div className="resumo-rotulo">Demandas concluídas</div>
                <span className="resumo-icone" style={{ color: 'var(--concluida)' }}><IconeCheckCirculo size={19} /></span>
              </div>
              <div className="resumo-caixa cinza">
                <div className="resumo-valor">{resumo.total}</div>
                <div className="resumo-rotulo">Total no mês</div>
                <span className="resumo-icone" style={{ color: 'var(--tinta-tenue)' }}><IconeDocumento size={19} /></span>
              </div>
            </div>
        </div>
      </div>
    </>
  );
}

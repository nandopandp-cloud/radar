'use client';

import { useMemo } from 'react';
import { Calendario } from '@/components/Calendario';
import { IconeAlerta, IconeCheckCirculo, IconeDocumento, IconeMais, IconeRelogio } from '@/components/icones';
import { COR_SITUACAO, PESO_SITUACAO, situacaoDe, type Situacao } from '@/lib/dominio';
import { formatarDiaExtenso } from '@/lib/datas';
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
  const doDia = useMemo(
    () =>
      demandas
        .filter((d) => d.prazo.slice(0, 10) === diaSelecionado)
        .map((d) => ({ d, situacao: situacaoDe(d.status, d.prazo.slice(0, 10), hoje) }))
        .sort((a, b) => PESO_SITUACAO[a.situacao] - PESO_SITUACAO[b.situacao]),
    [demandas, diaSelecionado, hoje],
  );

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

      <div className="grade-calendario">
        <Calendario
          ano={ano}
          mes={mes}
          hoje={hoje}
          diaSelecionado={diaSelecionado}
          demandas={demandas}
          aoSelecionar={aoSelecionarDia}
          aoMudarMes={aoMudarMes}
        />

        <div className="pilha">
          <div className="cartao">
            <div className="cartao-cabecalho">
              <div>
                <div className="cartao-titulo">Demandas do dia</div>
                <div className="cartao-desc" style={{ textTransform: 'capitalize' }}>
                  {formatarDiaExtenso(diaSelecionado)}
                </div>
              </div>
              <span className="texto-suave">
                {doDia.length} {doDia.length === 1 ? 'demanda' : 'demandas'}
              </span>
            </div>

            {doDia.length === 0 ? (
              <div className="vazio" style={{ padding: '26px 24px' }}>
                <div className="vazio-texto">Nenhuma demanda com prazo neste dia.</div>
              </div>
            ) : (
              <div className="dia-lista">
                {doDia.map(({ d, situacao }) => (
                  <button
                    key={d.id}
                    className={`dia-item${situacao === 'ATRASADA' ? ' atrasada' : ''}`}
                    onClick={() => aoAbrirDemanda(d)}
                  >
                    <span
                      className="ponto"
                      style={{ background: COR_SITUACAO[situacao], marginTop: 6 }}
                    />
                    <div className="dia-item-corpo">
                      <div className="dia-item-topo">
                        <span className="dia-item-titulo">{d.titulo}</span>
                        <span className={`selo selo-prazo${situacao === 'ATRASADA' ? '' : ' ok'}`}>
                          Prazo: {new Intl.DateTimeFormat('pt-BR', {
                            day: '2-digit', month: 'short', timeZone: 'UTC',
                          }).format(new Date(`${d.prazo.slice(0, 10)}T00:00:00Z`)).replace('.', '')}
                        </span>
                      </div>
                      {d.descricao && <div className="dia-item-desc">{d.descricao}</div>}
                      {sessao.perfil === 'ADMIN' && (
                        <div className="dia-item-desc">{d.autor.nome}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div style={{ padding: '0 18px 18px' }}>
              <button className="btn-adicionar-dia" onClick={() => aoNovaDemanda(diaSelecionado)}>
                <IconeMais size={17} />
                Adicionar demanda em{' '}
                {new Intl.DateTimeFormat('pt-BR', {
                  day: 'numeric', month: 'long', timeZone: 'UTC',
                }).format(new Date(`${diaSelecionado}T00:00:00Z`))}
              </button>
            </div>
          </div>

          <div className="cartao">
            <div className="cartao-cabecalho">
              <div className="cartao-titulo">Resumo do mês</div>
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
      </div>
    </>
  );
}

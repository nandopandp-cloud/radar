'use client';

import { useMemo, useState } from 'react';
import { Calendario } from '@/components/Calendario';
import { MiniCalendario } from '@/components/MiniCalendario';
import { SeloOfensiva } from '@/components/OfensivaRadar';
import {
  IconeAlerta, IconeCheckCirculo, IconeCirculo, IconeDocumento,
  IconeMais, IconeRelogio,
} from '@/components/icones';
import {
  COR_SITUACAO, PESO_SITUACAO, ROTULO_PRIORIDADE, ROTULO_SITUACAO,
  situacaoDe, type Situacao,
} from '@/lib/dominio';
import { diaParaDate } from '@/lib/datas';
import type { Demanda, SessaoUI } from '@/lib/tipos';
import type { Ofensiva } from '@/lib/ofensiva';

/**
 * Quantas demandas o cartão do dia mostra antes de remeter ao modal, que
 * lista todas. Três mantém o cartão raso o bastante para a coluna fechar
 * junto com a lateral.
 */
const MAXIMO_AGENDA = 3;

/** Linhas do resumo do mês, na ordem em que aparecem no painel. */
const LINHAS_RESUMO: { situacao: Situacao; rotulo: string; tom: string; Icone: typeof IconeRelogio }[] = [
  { situacao: 'ATRASADA', rotulo: 'Atrasadas', tom: 'vermelho', Icone: IconeAlerta },
  { situacao: 'PENDENTE', rotulo: 'Em aberto', tom: 'azul', Icone: IconeRelogio },
  { situacao: 'CONCLUIDA', rotulo: 'Concluídas', tom: 'verde', Icone: IconeCheckCirculo },
  { situacao: 'EM_ANDAMENTO', rotulo: 'Em andamento', tom: 'ambar', Icone: IconeCirculo },
];

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
  ofensiva,
  aoAbrirOfensiva,
  ofensivaPulsando,
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
  ofensiva: Ofensiva | null;
  aoAbrirOfensiva: () => void;
  ofensivaPulsando: boolean;
}) {
  /** Situação em foco na grade; `null` mostra todas. */
  const [filtro, setFiltro] = useState<Situacao | null>(null);

  // Resumo considera apenas o mês exibido.
  const contagem = useMemo(() => {
    const doMes = demandas.filter((d) => {
      const dt = diaParaDate(d.prazo.slice(0, 10));
      return dt.getUTCFullYear() === ano && dt.getUTCMonth() === mes;
    });
    const zerado: Record<Situacao, number> = {
      ATRASADA: 0, PENDENTE: 0, EM_ANDAMENTO: 0, CONCLUIDA: 0, CANCELADA: 0,
    };
    for (const d of doMes) {
      zerado[situacaoDe(d.status, d.prazo.slice(0, 10), hoje)] += 1;
    }
    return { ...zerado, total: doMes.length };
  }, [demandas, ano, mes, hoje]);

  /** Demandas do dia selecionado — a agenda do painel lateral. */
  const doDia = useMemo(
    () =>
      demandas
        .filter((d) => d.prazo.slice(0, 10) === diaSelecionado)
        .map((d) => ({ d, situacao: situacaoDe(d.status, diaSelecionado, hoje) }))
        .sort((a, b) => PESO_SITUACAO[a.situacao] - PESO_SITUACAO[b.situacao]),
    [demandas, diaSelecionado, hoje],
  );

  const primeiroNome = sessao.nome.trim().split(/\s+/)[0];

  const rotuloDiaSelecionado = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric', month: 'long', timeZone: 'UTC',
  }).format(diaParaDate(diaSelecionado));

  function irParaHoje() {
    const d = diaParaDate(hoje);
    aoMudarMes(d.getUTCFullYear(), d.getUTCMonth());
    aoSelecionarDia(hoje);
  }

  return (
    <>
      <div className="espalhar" style={{ marginBottom: 22 }}>
        <div>
          <h1 className="saudacao">Olá, {primeiroNome}!</h1>
          <p className="saudacao-sub">
            Organize suas demandas, acompanhe prazos e receba alertas automaticamente.
          </p>
        </div>
        <div className="cabecalho-acoes-tela">
          {sessao.perfil !== 'ADMIN' && (
            <SeloOfensiva ofensiva={ofensiva} pulsando={ofensivaPulsando} aoAbrir={aoAbrirOfensiva} />
          )}
          <button className="btn btn-primario" onClick={() => aoNovaDemanda(diaSelecionado)}>
            <IconeMais size={18} /> Nova demanda
          </button>
        </div>
      </div>

      <div className="grade-calendario">
        <div className="coluna-calendario">
          <Calendario
            ano={ano}
            mes={mes}
            hoje={hoje}
            diaSelecionado={diaSelecionado}
            demandas={demandas}
            filtro={filtro}
            contagem={contagem}
            aoFiltrar={setFiltro}
            aoSelecionar={aoSelecionarDia}
            aoMudarMes={aoMudarMes}
          />

          <div className="cartao">
            <div className="cartao-cabecalho">
              <div>
                <div className="cartao-titulo">Demandas do dia</div>
                <div className="cartao-desc primeira-maiuscula">{rotuloDiaSelecionado}</div>
              </div>
              {doDia.length > 0 && (
                <button
                  className="btn btn-secundario btn-pequeno"
                  onClick={() => aoSelecionarDia(diaSelecionado)}
                >
                  Ver todas{doDia.length > MAXIMO_AGENDA ? ` (${doDia.length})` : ''}
                </button>
              )}
            </div>

            {doDia.length === 0 ? (
              <div className="agenda-vazia">
                <p>Nenhuma demanda com prazo neste dia.</p>
                <button className="btn-adicionar-dia" onClick={() => aoNovaDemanda(diaSelecionado)}>
                  <IconeMais size={16} /> Criar demanda
                </button>
              </div>
            ) : (
              <div className="agenda">
                {doDia.slice(0, MAXIMO_AGENDA).map(({ d, situacao }) => (
                  <button key={d.id} className="agenda-item" onClick={() => aoAbrirDemanda(d)}>
                    <span className="ponto" style={{ background: COR_SITUACAO[situacao] }} />
                    <span className="agenda-texto">
                      <span className="agenda-titulo">{d.titulo}</span>
                      <span className="agenda-sub">
                        {ROTULO_SITUACAO[situacao]}
                        <span className="agenda-separador">•</span>
                        {ROTULO_PRIORIDADE[d.prioridade as keyof typeof ROTULO_PRIORIDADE] ?? d.prioridade}
                      </span>
                    </span>
                  </button>
                ))}
                {/* O restante fica no modal do dia, que já lista tudo. */}
                {doDia.length > MAXIMO_AGENDA && (
                  <button className="agenda-mais" onClick={() => aoSelecionarDia(diaSelecionado)}>
                    +{doDia.length - MAXIMO_AGENDA}{' '}
                    {doDia.length - MAXIMO_AGENDA === 1 ? 'outra demanda' : 'outras demandas'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="painel-lateral">
          <MiniCalendario
            ano={ano}
            mes={mes}
            hoje={hoje}
            diaSelecionado={diaSelecionado}
            demandas={demandas}
            aoSelecionar={aoSelecionarDia}
            aoIrParaHoje={irParaHoje}
          />

          <div className="cartao">
            <div className="cartao-cabecalho">
              <div className="cartao-titulo">Resumo do mês</div>
            </div>
            <div className="resumo-linhas">
              <div className="resumo-linha neutro">
                <span className="resumo-linha-icone"><IconeDocumento size={18} /></span>
                <div>
                  <div className="resumo-linha-valor">{contagem.total}</div>
                  <div className="resumo-linha-rotulo">Demandas no mês</div>
                </div>
              </div>
              {LINHAS_RESUMO.map(({ situacao, rotulo, tom, Icone }) => (
                <button
                  key={situacao}
                  className={`resumo-linha ${tom}${filtro === situacao ? ' ativo' : ''}`}
                  aria-pressed={filtro === situacao}
                  onClick={() => setFiltro(filtro === situacao ? null : situacao)}
                  title={`Ver apenas ${rotulo.toLowerCase()} no calendário`}
                >
                  <span className="resumo-linha-icone" style={{ color: COR_SITUACAO[situacao] }}>
                    <Icone size={18} />
                  </span>
                  <div>
                    <div className="resumo-linha-valor" style={{ color: COR_SITUACAO[situacao] }}>
                      {contagem[situacao]}
                    </div>
                    <div className="resumo-linha-rotulo">{rotulo}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

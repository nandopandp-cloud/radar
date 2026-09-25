'use client';

import { useMemo, useState } from 'react';
import { Calendario } from '@/components/Calendario';
import { MiniCalendario } from '@/components/MiniCalendario';
import { SeloOfensiva } from '@/components/OfensivaRadar';
import {
  IconeAlerta, IconeBandeira, IconeCheckCirculo, IconeCirculo, IconeDireita, IconeDocumento,
  IconeMais, IconeRelogio, IconeUsuario,
} from '@/components/icones';
import {
  COR_SITUACAO, PESO_SITUACAO, ROTULO_PRIORIDADE, ROTULO_SITUACAO,
  situacaoDe, type Situacao,
} from '@/lib/dominio';
import { diaParaDate, somarDias } from '@/lib/datas';
import { proximosPrazos } from '@/lib/painel';
import type { Demanda, SessaoUI } from '@/lib/tipos';
import type { Ofensiva } from '@/lib/ofensiva';

/**
 * Quantas demandas o cartão do dia mostra antes de remeter ao modal, que
 * lista todas. Três mantém o cartão raso o bastante para a coluna fechar
 * junto com a lateral.
 */
const MAXIMO_AGENDA = 3;
/** No celular a lista é a única visão do dia, então mostra um pouco mais. */
const MAXIMO_AGENDA_CELULAR = 4;

/** "Hoje", "Amanhã", "Ontem", "Seg" (na semana que vem) ou "28 set". */
function rotuloDia(dia: string, hoje: string): string {
  if (dia === hoje) return 'Hoje';
  if (dia === somarDias(hoje, 1)) return 'Amanhã';
  if (dia === somarDias(hoje, -1)) return 'Ontem';
  const data = diaParaDate(dia);
  if (dia > hoje && dia <= somarDias(hoje, 6)) {
    const semana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(data);
    return semana.charAt(0).toUpperCase() + semana.slice(1, 3);
  }
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(data).replace('.', '');
}

/**
 * Linha de demanda do celular: quem, e então a prioridade enquanto ela está
 * em aberto ou a situação quando já andou, e o dia do prazo.
 */
function MetaDemanda({ d, situacao, hoje }: { d: Demanda; situacao: Situacao; hoje: string }) {
  const andou = situacao === 'CONCLUIDA' || situacao === 'EM_ANDAMENTO';
  return (
    <span className="lista-dia-meta">
      <span><IconeUsuario size={14} /> {d.autor.nome}</span>
      {andou ? (
        <span className={`selo selo-${situacao}`}>{ROTULO_SITUACAO[situacao]}</span>
      ) : (
        <span className={`lista-dia-prioridade prioridade-${d.prioridade}`}>
          <IconeBandeira size={14} />
          {ROTULO_PRIORIDADE[d.prioridade as keyof typeof ROTULO_PRIORIDADE] ?? d.prioridade}
        </span>
      )}
      <span><IconeRelogio size={14} /> {rotuloDia(d.prazo.slice(0, 10), hoje)}</span>
    </span>
  );
}

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
  aoVerDemandas,
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
  aoVerDemandas: () => void;
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

  const prazos = useMemo(() => proximosPrazos(demandas, hoje, 4), [demandas, hoje]);

  const primeiroNome = sessao.nome.trim().split(/\s+/)[0];

  const rotuloDiaSelecionado = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric', month: 'long', timeZone: 'UTC',
  }).format(diaParaDate(diaSelecionado));
  const rotuloDiaComAno = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(diaParaDate(diaSelecionado));

  function irParaHoje() {
    const d = diaParaDate(hoje);
    aoMudarMes(d.getUTCFullYear(), d.getUTCMonth());
    aoSelecionarDia(hoje);
  }

  return (
    <>
      <div className="espalhar cal-cabecalho" style={{ marginBottom: 22 }}>
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
                <div className="cartao-desc primeira-maiuscula so-desktop">{rotuloDiaSelecionado}</div>
                <div className="cartao-desc so-celular">{rotuloDiaComAno}</div>
              </div>
              {doDia.length > 0 && (
                <button
                  className="btn btn-secundario btn-pequeno"
                  onClick={() => aoSelecionarDia(diaSelecionado)}
                >
                  Ver todas
                  <span className="so-desktop">{doDia.length > MAXIMO_AGENDA ? ` (${doDia.length})` : ''}</span>
                  <span className="so-celular">{` (${doDia.length})`}</span>
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
              <>
              <ul className="lista-dia so-celular">
                {doDia.slice(0, MAXIMO_AGENDA_CELULAR).map(({ d, situacao }) => (
                  <li key={d.id}>
                    <button className="lista-dia-item" onClick={() => aoAbrirDemanda(d)}>
                      <span className="ponto" style={{ background: COR_SITUACAO[situacao] }} />
                      <span className="lista-dia-texto">
                        <span className="lista-dia-titulo">{d.titulo}</span>
                        <MetaDemanda d={d} situacao={situacao} hoje={hoje} />
                      </span>
                      <IconeDireita size={18} className="lista-dia-seta" />
                    </button>
                  </li>
                ))}
                {doDia.length > MAXIMO_AGENDA_CELULAR && (
                  <li>
                    <button className="lista-dia-mais" onClick={() => aoSelecionarDia(diaSelecionado)}>
                      +{doDia.length - MAXIMO_AGENDA_CELULAR}{' '}
                      {doDia.length - MAXIMO_AGENDA_CELULAR === 1 ? 'outra demanda' : 'outras demandas'}
                    </button>
                  </li>
                )}
              </ul>
              <div className="agenda so-desktop">
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
              </>
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

          {/* Só no celular: no desktop os prazos já estão no Dashboard. */}
          <div className="cartao so-celular">
            <div className="cartao-cabecalho">
              <div className="cartao-titulo">Próximos prazos</div>
              <button className="btn btn-secundario btn-pequeno" onClick={aoVerDemandas}>
                Ver todos
              </button>
            </div>
            {prazos.length === 0 ? (
              <p className="agenda-vazia">Nenhum prazo em aberto.</p>
            ) : (
              <ul className="lista-dia">
                {prazos.map((d) => {
                  const dia = d.prazo.slice(0, 10);
                  const situacao = situacaoDe(d.status, dia, hoje);
                  const mesCurto = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
                    .format(diaParaDate(dia)).replace('.', '').toUpperCase();
                  return (
                    <li key={d.id}>
                      <button className="lista-dia-item" onClick={() => aoAbrirDemanda(d)}>
                        <span className={`prazo-data${situacao === 'ATRASADA' ? ' atrasada' : ''}`}>
                          <span className="prazo-dia">{Number(dia.slice(8, 10))}</span>
                          <span className="prazo-mes">{mesCurto}</span>
                        </span>
                        <span className="lista-dia-texto">
                          <span className="lista-dia-titulo">{d.titulo}</span>
                          <span className="lista-dia-meta">
                            <span><IconeUsuario size={14} /> {d.autor.nome}</span>
                            <span><IconeRelogio size={14} /> {rotuloDia(dia, hoje)}</span>
                          </span>
                        </span>
                        <span className={`selo selo-${situacao}`}>{ROTULO_SITUACAO[situacao]}</span>
                        <IconeDireita size={18} className="lista-dia-seta" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

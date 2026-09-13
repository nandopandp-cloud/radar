'use client';

import { useMemo, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import {
  BlocoRosca, GraficoBarras, GraficoEvolucao, LegendaEvolucao,
} from '@/components/Graficos';
import { SeletorPeriodo } from '@/components/SeletorPeriodo';
import {
  IconeAlerta, IconeCheckCirculo, IconeDocumento, IconeRelogio,
} from '@/components/icones';
import { COR_SITUACAO, ROTULO_PRIORIDADE, ROTULO_SITUACAO, situacaoDe, type Prioridade } from '@/lib/dominio';
import { formatarDiaCurto } from '@/lib/datas';
import {
  calcularKpis, dentroDoIntervalo, intervaloDe, porCategoria, porPrioridade,
  porSituacao, proximosPrazos, recentes, serieDiaria, topResponsaveis,
  type Intervalo, type PeriodoId,
} from '@/lib/painel';
import type { Demanda, SessaoUI, Usuario } from '@/lib/tipos';

const ICONE_KPI: Record<string, typeof IconeDocumento> = {
  total: IconeDocumento,
  aberto: IconeRelogio,
  concluidas: IconeCheckCirculo,
  atrasadas: IconeAlerta,
};

/** "Hoje, 10:24" · "Ontem, 18:42" · "10 set, 14:32" */
function quando(iso: string): string {
  const data = new Date(iso);
  const hora = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  }).format(data);

  const hoje = new Date();
  const dia = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
  const ontem = new Date(hoje.getTime() - 86_400_000);

  if (dia(data) === dia(hoje)) return `Hoje, ${hora}`;
  if (dia(data) === dia(ontem)) return `Ontem, ${hora}`;

  const curto = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo',
  }).format(data).replace('.', '');
  return `${curto}, ${hora}`;
}

export function TelaPainel({
  sessao,
  demandas,
  equipe,
  hoje,
  aoAbrirDemanda,
  aoVerDemandas,
}: {
  sessao: SessaoUI;
  demandas: Demanda[];
  equipe: Usuario[];
  hoje: string;
  aoAbrirDemanda: (d: Demanda) => void;
  aoVerDemandas: () => void;
}) {
  const [periodo, setPeriodo] = useState<PeriodoId>('30');
  const [personalizado, setPersonalizado] = useState<Intervalo | null>(null);

  const intervalo = useMemo(
    () => intervaloDe(periodo, hoje, personalizado),
    [periodo, hoje, personalizado],
  );

  /** Tudo abaixo dos KPIs olha só o período escolhido. */
  const noPeriodo = useMemo(
    () => demandas.filter((d) => dentroDoIntervalo(d, intervalo)),
    [demandas, intervalo],
  );

  const kpis = useMemo(() => calcularKpis(demandas, hoje, intervalo), [demandas, hoje, intervalo]);
  const serie = useMemo(() => serieDiaria(demandas, hoje, intervalo), [demandas, hoje, intervalo]);
  const categorias = useMemo(() => porCategoria(noPeriodo), [noPeriodo]);
  const situacoes = useMemo(() => porSituacao(noPeriodo, hoje), [noPeriodo, hoje]);
  const prioridades = useMemo(() => porPrioridade(noPeriodo), [noPeriodo]);
  const listaRecentes = useMemo(() => recentes(noPeriodo), [noPeriodo]);
  const prazos = useMemo(() => proximosPrazos(demandas, hoje), [demandas, hoje]);

  /** Top responsáveis com o avatar de quem está na equipe. */
  const responsaveis = useMemo(() => {
    const porId = new Map(equipe.map((u) => [u.id, u.avatar]));
    return topResponsaveis(noPeriodo).map((r) => ({ ...r, avatar: porId.get(r.id) ?? null }));
  }, [noPeriodo, equipe]);

  const maiorResponsavel = responsaveis[0]?.valor ?? 1;
  const primeiroNome = sessao.nome.trim().split(/\s+/)[0];

  return (
    <>
      <div className="painel-topo">
        <div>
          <h1 className="saudacao">Olá, {primeiroNome}!</h1>
          <p className="saudacao-sub">
            Aqui está o panorama geral das suas demandas e da equipe.
          </p>
        </div>
        <div className="painel-filtros">
          {intervalo && (
            <span className="painel-intervalo">
              {formatarDiaCurto(intervalo.de)} → {formatarDiaCurto(intervalo.ate)}
            </span>
          )}
          <SeletorPeriodo
            periodo={periodo}
            personalizado={personalizado}
            intervalo={intervalo}
            hoje={hoje}
            aoMudar={(p, custom) => { setPeriodo(p); setPersonalizado(custom); }}
          />
        </div>
      </div>

      <div className="kpis">
        {kpis.map((k) => {
          const Icone = ICONE_KPI[k.id];
          const subiu = (k.variacao ?? 0) > 0;
          // Em atrasadas, cair é bom: a cor segue o efeito, não a direção.
          const bom = k.quedaEhBoa ? !subiu : subiu;
          return (
            <div className={`kpi kpi-${k.id}`} key={k.id}>
              <span className="kpi-icone"><Icone size={22} /></span>
              <div className="kpi-corpo">
                <div className="kpi-rotulo">{k.rotulo}</div>
                <div className="kpi-valor">{k.valor}</div>
                <div className="kpi-rodape">
                  {k.variacao === null ? (
                    <span className="kpi-sem">sem base de comparação</span>
                  ) : (
                    <>
                      <span className={`kpi-variacao${bom ? ' boa' : ' ruim'}`}>
                        {subiu ? '↑' : '↓'} {Math.abs(k.variacao)}%
                      </span>
                      <span className="kpi-versus">vs. período anterior</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="painel-grade painel-grade-2">
        <div className="cartao">
          <div className="cartao-cabecalho">
            <div>
              <div className="cartao-titulo">Evolução de demandas</div>
              <div className="cartao-desc">Total por situação ao longo do tempo</div>
            </div>
          </div>
          <div className="cartao-corpo cartao-corpo-grafico">
            <GraficoEvolucao serie={serie} />
            <LegendaEvolucao />
          </div>
        </div>

        <div className="cartao">
          <div className="cartao-cabecalho">
            <div className="cartao-titulo">Demandas por categoria</div>
          </div>
          <div className="cartao-corpo">
            <BlocoRosca fatias={categorias} total={noPeriodo.length} />
          </div>
        </div>
      </div>

      <div className="painel-grade painel-grade-3">
        <div className="cartao">
          <div className="cartao-cabecalho">
            <div>
              <div className="cartao-titulo">Top responsáveis</div>
              <div className="cartao-desc">Demandas atribuídas no período</div>
            </div>
          </div>
          <div className="cartao-corpo">
            {responsaveis.length === 0 ? (
              <p className="grafico-vazio">Sem demandas no período.</p>
            ) : (
              <ul className="ranking">
                {responsaveis.map((r) => (
                  <li key={r.id}>
                    <Avatar nome={r.nome} avatar={r.avatar} tamanho="sm" />
                    <span className="ranking-nome">{r.nome}</span>
                    <span className="ranking-trilho">
                      <span
                        className="ranking-barra"
                        style={{ width: `${(r.valor / maiorResponsavel) * 100}%` }}
                      />
                    </span>
                    <span className="ranking-valor">{r.valor}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="cartao">
          <div className="cartao-cabecalho">
            <div className="cartao-titulo">Status das demandas</div>
          </div>
          <div className="cartao-corpo">
            <BlocoRosca fatias={situacoes} total={noPeriodo.length} />
          </div>
        </div>

        <div className="cartao">
          <div className="cartao-cabecalho">
            <div className="cartao-titulo">Prioridade</div>
          </div>
          <div className="cartao-corpo">
            <GraficoBarras barras={prioridades} />
          </div>
        </div>
      </div>

      <div className="painel-grade painel-grade-baixo">
        <div className="cartao">
          <div className="cartao-cabecalho">
            <div>
              <div className="cartao-titulo">Demandas recentes</div>
              <div className="cartao-desc">Últimas demandas criadas</div>
            </div>
            <button className="btn btn-secundario btn-pequeno" onClick={aoVerDemandas}>
              Ver todas
            </button>
          </div>
          <div className="tabela-envolvente">
            <table className="tabela tabela-painel">
              <thead>
                <tr>
                  <th>Demanda</th>
                  <th>Responsável</th>
                  <th>Status</th>
                  <th>Prioridade</th>
                  <th>Criada</th>
                </tr>
              </thead>
              <tbody>
                {listaRecentes.length === 0 ? (
                  <tr><td colSpan={5} className="vazio">Nenhuma demanda no período.</td></tr>
                ) : listaRecentes.map((d) => {
                  const situacao = situacaoDe(d.status, d.prazo.slice(0, 10), hoje);
                  return (
                    <tr key={d.id} className="linha-clicavel" onClick={() => aoAbrirDemanda(d)}>
                      <td>
                        <span className="celula-titulo">
                          <span className="ponto" style={{ background: COR_SITUACAO[situacao] }} />
                          {d.titulo}
                        </span>
                      </td>
                      <td className="texto-suave">{d.autor.nome}</td>
                      <td><span className={`selo selo-${situacao}`}>{ROTULO_SITUACAO[situacao]}</span></td>
                      <td>
                        <span className={`selo selo-${d.prioridade}`}>
                          {ROTULO_PRIORIDADE[d.prioridade as Prioridade] ?? d.prioridade}
                        </span>
                      </td>
                      <td className="texto-suave">{quando(d.criadoEm)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="cartao">
          <div className="cartao-cabecalho">
            <div className="cartao-titulo">Próximos prazos</div>
            <button className="btn btn-secundario btn-pequeno" onClick={aoVerDemandas}>
              Ver todas
            </button>
          </div>
          <div className="cartao-corpo">
            {prazos.length === 0 ? (
              <p className="grafico-vazio">Nenhum prazo em aberto.</p>
            ) : (
              <ul className="prazos">
                {prazos.map((d) => {
                  const dia = d.prazo.slice(0, 10);
                  const situacao = situacaoDe(d.status, dia, hoje);
                  const numero = dia.slice(8, 10);
                  const mesCurto = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
                    .format(new Date(`${dia}T00:00:00Z`)).replace('.', '').toUpperCase();
                  return (
                    <li key={d.id}>
                      <button className="prazo-item" onClick={() => aoAbrirDemanda(d)}>
                        <span className={`prazo-data${situacao === 'ATRASADA' ? ' atrasada' : ''}`}>
                          <span className="prazo-dia">{Number(numero)}</span>
                          <span className="prazo-mes">{mesCurto}</span>
                        </span>
                        <span className="prazo-texto">
                          <span className="prazo-titulo">{d.titulo}</span>
                          <span className="prazo-autor">{d.autor.nome}</span>
                        </span>
                        <span className={`selo selo-${situacao}`}>{ROTULO_SITUACAO[situacao]}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

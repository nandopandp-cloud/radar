'use client';

import { useEffect, useMemo } from 'react';
import {
  GraficoBarras, GraficoEvolucao, GraficoRosca, LegendaEvolucao, LegendaRosca,
} from '@/components/Graficos';
import { COR_SITUACAO, ROTULO_PRIORIDADE, ROTULO_SITUACAO, situacaoDe, type Prioridade } from '@/lib/dominio';
import { formatarDiaCompleto, formatarDiaCurto, somarDias } from '@/lib/datas';
import {
  calcularDesempenho, calcularKpis, calcularScore, dentroDoIntervalo, diasNoIntervalo,
  faixaDoScore, indicadoresDesempenho, porCategoria, porPrioridade, porSituacao,
  recentes, serieDiaria, topResponsaveis, type Intervalo,
} from '@/lib/painel';
import type { Demanda } from '@/lib/tipos';

/** Quantas demandas recentes cabem na folha sem empurrar o resto. */
const RECENTES_NO_PDF = 12;

/**
 * O painel em formato de folha, para salvar como PDF.
 *
 * Usa os mesmos cálculos e os mesmos gráficos da tela — o relatório precisa
 * bater com o que o admin viu, e duplicar as contas seria pedir para os dois
 * divergirem. Só a interação sai: nada de filtros, links ou dicas de mouse.
 */
export function RelatorioPainel({
  demandas,
  hoje,
  intervalo,
  rotulo,
  geradoPor,
}: {
  demandas: Demanda[];
  hoje: string;
  intervalo: Intervalo | null;
  /** Nome do período escolhido na tela ("Últimos 7 dias"). */
  rotulo: string | null;
  geradoPor: string;
}) {
  const noPeriodo = useMemo(
    () => demandas.filter((d) => dentroDoIntervalo(d, intervalo)),
    [demandas, intervalo],
  );

  const desempenho = useMemo(() => calcularDesempenho(noPeriodo, hoje), [noPeriodo, hoje]);
  const desempenhoAnterior = useMemo(() => {
    if (!intervalo) return null;
    const dias = diasNoIntervalo(intervalo);
    const ate = somarDias(intervalo.de, -1);
    const de = somarDias(ate, -(dias - 1));
    const antes = demandas.filter((d) => {
      const dia = d.prazo.slice(0, 10);
      return dia >= de && dia <= ate;
    });
    return calcularDesempenho(antes, hoje);
  }, [demandas, hoje, intervalo]);

  const score = useMemo(() => calcularScore(desempenho), [desempenho]);
  const indicadores = useMemo(
    () => indicadoresDesempenho(desempenho, desempenhoAnterior),
    [desempenho, desempenhoAnterior],
  );
  const kpis = useMemo(() => calcularKpis(demandas, hoje, intervalo), [demandas, hoje, intervalo]);
  const serie = useMemo(() => serieDiaria(demandas, hoje, intervalo), [demandas, hoje, intervalo]);
  const categorias = useMemo(() => porCategoria(noPeriodo), [noPeriodo]);
  const situacoes = useMemo(() => porSituacao(noPeriodo, hoje), [noPeriodo, hoje]);
  const prioridades = useMemo(() => porPrioridade(noPeriodo), [noPeriodo]);
  const responsaveis = useMemo(() => topResponsaveis(noPeriodo, 10), [noPeriodo]);
  const listaRecentes = useMemo(() => recentes(noPeriodo, RECENTES_NO_PDF), [noPeriodo]);

  const maiorResponsavel = responsaveis[0]?.valor ?? 1;

  /*
   * Abre a impressão sozinho: quem clicou em "Baixar PDF" já pediu o arquivo,
   * e o diálogo do navegador é onde se escolhe "Salvar como PDF".
   */
  useEffect(() => {
    const id = setTimeout(() => window.print(), 600);
    return () => clearTimeout(id);
  }, []);

  const periodoTexto = intervalo
    ? `${formatarDiaCompleto(intervalo.de)} a ${formatarDiaCompleto(intervalo.ate)}`
    : 'Todo o período';

  const geradoEm = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  return (
    <div className="relatorio">
      <div className="relatorio-acoes">
        <button type="button" className="btn btn-primario" onClick={() => window.print()}>
          Baixar PDF
        </button>
        <span className="texto-suave">
          No diálogo de impressão, escolha “Salvar como PDF”.
        </span>
      </div>

      <header className="relatorio-cabecalho">
        <div>
          <div className="relatorio-marca">Radar · MSA</div>
          <h1 className="relatorio-titulo">Relatório do painel</h1>
        </div>
        <div className="relatorio-meta">
          <div><strong>Período:</strong> {rotulo ? `${rotulo} · ` : ''}{periodoTexto}</div>
          <div><strong>Gerado em:</strong> {geradoEm}</div>
          <div><strong>Por:</strong> {geradoPor}</div>
        </div>
      </header>

      <section className="relatorio-secao">
        <h2 className="relatorio-secao-titulo">Desempenho</h2>
        <div className="relatorio-indicadores">
          <div className="relatorio-cartao relatorio-score">
            <div className="relatorio-rotulo">Radar Score</div>
            {score === null ? (
              <div className="relatorio-valor-vazio">
                Sem demandas apuradas no período.
              </div>
            ) : (
              <>
                <div className="relatorio-score-numero" style={{ color: faixaDoScore(score).cor }}>
                  {score}
                </div>
                <div className="relatorio-score-faixa">{faixaDoScore(score).rotulo}</div>
              </>
            )}
          </div>

          {indicadores.map((ind) => (
            <div className="relatorio-cartao" key={ind.id}>
              <div className="relatorio-rotulo">{ind.rotulo}</div>
              <div className="relatorio-valor">{ind.valor}</div>
              <div className="relatorio-sub">
                {ind.variacao ? `${ind.variacao} · ` : ''}{ind.rodape}
              </div>
            </div>
          ))}
        </div>

        <div className="relatorio-indicadores">
          {kpis.map((k) => (
            <div className="relatorio-cartao" key={k.id}>
              <div className="relatorio-rotulo">{k.rotulo}</div>
              <div className="relatorio-valor">{k.valor}</div>
              <div className="relatorio-sub">
                {k.variacao === null
                  ? 'sem base de comparação'
                  : `${k.variacao > 0 ? '↑' : '↓'} ${Math.abs(k.variacao)}% vs. período anterior`}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relatorio-secao">
        <h2 className="relatorio-secao-titulo">Evolução de demandas</h2>
        <div className="relatorio-grafico">
          <GraficoEvolucao serie={serie} />
          <LegendaEvolucao />
        </div>
      </section>

      <section className="relatorio-secao relatorio-quebra">
        <h2 className="relatorio-secao-titulo">Distribuição</h2>
        <div className="relatorio-grade-2">
          <div className="relatorio-bloco">
            <div className="relatorio-bloco-titulo">Por categoria</div>
            <div className="rosca-bloco">
              <GraficoRosca fatias={categorias} total={noPeriodo.length} />
              <LegendaRosca fatias={categorias} />
            </div>
          </div>
          <div className="relatorio-bloco">
            <div className="relatorio-bloco-titulo">Por situação</div>
            <div className="rosca-bloco">
              <GraficoRosca fatias={situacoes} total={noPeriodo.length} />
              <LegendaRosca fatias={situacoes} />
            </div>
          </div>
        </div>

        <div className="relatorio-grade-2">
          <div className="relatorio-bloco">
            <div className="relatorio-bloco-titulo">Por prioridade</div>
            <GraficoBarras barras={prioridades} />
          </div>
          <div className="relatorio-bloco">
            <div className="relatorio-bloco-titulo">Demandas por responsável</div>
            {responsaveis.length === 0 ? (
              <p className="grafico-vazio">Sem demandas no período.</p>
            ) : (
              <ul className="ranking">
                {responsaveis.map((r) => (
                  <li key={r.id}>
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
      </section>

      <section className="relatorio-secao relatorio-quebra">
        <h2 className="relatorio-secao-titulo">
          Demandas do período ({noPeriodo.length} no total)
        </h2>
        <table className="tabela relatorio-tabela">
          <thead>
            <tr>
              <th>Demanda</th>
              <th>Responsável</th>
              <th>Categoria</th>
              <th>Status</th>
              <th>Prioridade</th>
              <th>Prazo</th>
            </tr>
          </thead>
          <tbody>
            {listaRecentes.length === 0 ? (
              <tr><td colSpan={6} className="vazio">Nenhuma demanda no período.</td></tr>
            ) : listaRecentes.map((d) => {
              const situacao = situacaoDe(d.status, d.prazo.slice(0, 10), hoje);
              return (
                <tr key={d.id}>
                  <td>
                    <span className="celula-titulo">
                      <span className="ponto" style={{ background: COR_SITUACAO[situacao] }} />
                      {d.titulo}
                    </span>
                  </td>
                  <td className="texto-suave">{d.autor.nome}</td>
                  <td className="texto-suave">{d.categoria || '—'}</td>
                  <td>{ROTULO_SITUACAO[situacao]}</td>
                  <td>{ROTULO_PRIORIDADE[d.prioridade as Prioridade] ?? d.prioridade}</td>
                  <td className="texto-suave">{formatarDiaCurto(d.prazo.slice(0, 10))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {noPeriodo.length > listaRecentes.length && (
          <p className="relatorio-nota">
            Mostrando as {listaRecentes.length} demandas mais recentes de {noPeriodo.length}.
          </p>
        )}
      </section>

      <footer className="relatorio-rodape">
        Radar · MSA — relatório gerado em {geradoEm}
      </footer>
    </div>
  );
}

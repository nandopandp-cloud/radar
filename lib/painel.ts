import { COR_SITUACAO, PESO_PRIORIDADE, ROTULO_PRIORIDADE, situacaoDe, type Prioridade, type Situacao } from '@/lib/dominio';
import { somarDias } from '@/lib/datas';
import type { Demanda } from '@/lib/tipos';

/** Atalhos do seletor. "personalizado" vem das datas escolhidas à mão. */
export const PERIODOS = [
  { id: '7', rotulo: 'Últimos 7 dias', dias: 7 },
  { id: '30', rotulo: 'Últimos 30 dias', dias: 30 },
  { id: '90', rotulo: 'Últimos 90 dias', dias: 90 },
  { id: 'tudo', rotulo: 'Todo o período', dias: 0 },
  { id: 'personalizado', rotulo: 'Personalizado', dias: -1 },
] as const;

export type PeriodoId = (typeof PERIODOS)[number]['id'];

export type Intervalo = { de: string; ate: string };

/**
 * Recorte de datas do período. Null = sem recorte (todo o histórico).
 * No modo personalizado o intervalo vem pronto de fora.
 */
export function intervaloDe(
  periodo: PeriodoId,
  hoje: string,
  personalizado?: Intervalo | null,
): Intervalo | null {
  if (periodo === 'personalizado') return personalizado ?? null;
  const p = PERIODOS.find((x) => x.id === periodo);
  if (!p || p.dias === 0) return null;
  // Inclui hoje: 30 dias = hoje e os 29 anteriores.
  return { de: somarDias(hoje, -(p.dias - 1)), ate: hoje };
}

/** Quantos dias um intervalo cobre, contando as duas pontas. */
export function diasNoIntervalo(intervalo: Intervalo): number {
  const de = Date.parse(`${intervalo.de}T00:00:00Z`);
  const ate = Date.parse(`${intervalo.ate}T00:00:00Z`);
  return Math.round((ate - de) / 86_400_000) + 1;
}

/** O dia que serve de referência para a demanda no painel. */
function diaDe(d: Demanda): string {
  return d.prazo.slice(0, 10);
}

export function dentroDoIntervalo(d: Demanda, intervalo: { de: string; ate: string } | null): boolean {
  if (!intervalo) return true;
  const dia = diaDe(d);
  return dia >= intervalo.de && dia <= intervalo.ate;
}

export type Kpi = {
  id: string;
  rotulo: string;
  valor: number;
  /** Variação percentual contra o período anterior; null quando não há base. */
  variacao: number | null;
  /** Se cair é bom (atrasadas), a seta para baixo fica verde. */
  quedaEhBoa?: boolean;
};

/** Conta demandas por situação num conjunto já filtrado. */
export function contarPorSituacao(demandas: Demanda[], hoje: string): Record<Situacao, number> {
  const zero: Record<Situacao, number> = {
    ATRASADA: 0, PENDENTE: 0, EM_ANDAMENTO: 0, CONCLUIDA: 0, CANCELADA: 0,
  };
  for (const d of demandas) zero[situacaoDe(d.status, diaDe(d), hoje)] += 1;
  return zero;
}

/** Variação percentual entre dois valores, arredondada. Null sem base. */
function variar(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}

/**
 * Os quatro cartões do topo. A comparação usa a janela imediatamente anterior
 * de mesmo tamanho — sem período definido não há com o que comparar.
 */
export function calcularKpis(
  demandas: Demanda[],
  hoje: string,
  intervalo: Intervalo | null,
): Kpi[] {
  const noPeriodo = demandas.filter((d) => dentroDoIntervalo(d, intervalo));
  const atual = contarPorSituacao(noPeriodo, hoje);

  let anterior: Record<Situacao, number> | null = null;
  if (intervalo) {
    // A janela anterior tem o mesmo tamanho, encostada no início desta.
    const dias = diasNoIntervalo(intervalo);
    const anteriorAte = somarDias(intervalo.de, -1);
    const anteriorDe = somarDias(anteriorAte, -(dias - 1));
    const antes = demandas.filter((d) => {
      const dia = diaDe(d);
      return dia >= anteriorDe && dia <= anteriorAte;
    });
    anterior = contarPorSituacao(antes, hoje);
  }

  const total = noPeriodo.length;
  const totalAntes = anterior
    ? anterior.ATRASADA + anterior.PENDENTE + anterior.EM_ANDAMENTO + anterior.CONCLUIDA + anterior.CANCELADA
    : 0;
  const emAberto = atual.PENDENTE + atual.EM_ANDAMENTO;
  const emAbertoAntes = anterior ? anterior.PENDENTE + anterior.EM_ANDAMENTO : 0;

  return [
    {
      id: 'total', rotulo: 'Total de demandas', valor: total,
      variacao: anterior ? variar(total, totalAntes) : null,
    },
    {
      id: 'aberto', rotulo: 'Em aberto', valor: emAberto,
      variacao: anterior ? variar(emAberto, emAbertoAntes) : null,
    },
    {
      id: 'concluidas', rotulo: 'Concluídas', valor: atual.CONCLUIDA,
      variacao: anterior ? variar(atual.CONCLUIDA, anterior.CONCLUIDA) : null,
    },
    {
      id: 'atrasadas', rotulo: 'Atrasadas', valor: atual.ATRASADA,
      variacao: anterior ? variar(atual.ATRASADA, anterior.ATRASADA) : null,
      quedaEhBoa: true,
    },
  ];
}

export type PontoSerie = { dia: string; valores: Record<Situacao, number> };

/**
 * Série diária para o gráfico de evolução: quantas demandas de cada situação
 * têm prazo em cada dia do intervalo.
 */
export function serieDiaria(
  demandas: Demanda[],
  hoje: string,
  intervalo: Intervalo | null,
): PontoSerie[] {
  // Sem intervalo, cobre do primeiro ao último prazo existente.
  let de: string; let ate: string;
  if (intervalo) {
    ({ de, ate } = intervalo);
  } else {
    const dias = demandas.map(diaDe).sort();
    if (dias.length === 0) return [];
    de = dias[0]; ate = dias[dias.length - 1];
  }

  const porDia = new Map<string, Record<Situacao, number>>();
  for (let dia = de; dia <= ate; dia = somarDias(dia, 1)) {
    porDia.set(dia, { ATRASADA: 0, PENDENTE: 0, EM_ANDAMENTO: 0, CONCLUIDA: 0, CANCELADA: 0 });
  }
  for (const d of demandas) {
    const dia = diaDe(d);
    const alvo = porDia.get(dia);
    if (alvo) alvo[situacaoDe(d.status, dia, hoje)] += 1;
  }

  return [...porDia.entries()].map(([dia, valores]) => ({ dia, valores }));
}

export type Fatia = { rotulo: string; valor: number; cor: string; percentual: number };

/** Divide em fatias com percentual, já ordenado do maior para o menor. */
function fatiar(entradas: { rotulo: string; valor: number; cor: string }[]): Fatia[] {
  const total = entradas.reduce((s, e) => s + e.valor, 0);
  return entradas
    .map((e) => ({ ...e, percentual: total === 0 ? 0 : Math.round((e.valor / total) * 100) }))
    .sort((a, b) => b.valor - a.valor);
}

/** Paleta das categorias — estável por posição, para a cor não dançar. */
const CORES_CATEGORIA = [
  '#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#94a3b8',
];

export function porCategoria(demandas: Demanda[]): Fatia[] {
  const mapa = new Map<string, number>();
  for (const d of demandas) {
    const c = d.categoria?.trim() || 'Sem categoria';
    mapa.set(c, (mapa.get(c) ?? 0) + 1);
  }
  const ordenado = [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  return fatiar(
    ordenado.map(([rotulo, valor], i) => ({
      rotulo,
      valor,
      // "Sem categoria" fica sempre cinza, as demais seguem a paleta.
      cor: rotulo === 'Sem categoria' ? '#94a3b8' : CORES_CATEGORIA[i % CORES_CATEGORIA.length],
    })),
  );
}

export function porSituacao(demandas: Demanda[], hoje: string): Fatia[] {
  const c = contarPorSituacao(demandas, hoje);
  return fatiar([
    { rotulo: 'Em aberto', valor: c.PENDENTE, cor: COR_SITUACAO.PENDENTE },
    { rotulo: 'Concluídas', valor: c.CONCLUIDA, cor: COR_SITUACAO.CONCLUIDA },
    { rotulo: 'Em andamento', valor: c.EM_ANDAMENTO, cor: COR_SITUACAO.EM_ANDAMENTO },
    { rotulo: 'Atrasadas', valor: c.ATRASADA, cor: COR_SITUACAO.ATRASADA },
  ]);
}

/** Cores das barras de prioridade, do mais grave ao mais leve. */
const COR_PRIORIDADE_BARRA: Record<Prioridade, string> = {
  CRITICA: '#ef4444',
  ALTA: '#f59e0b',
  MEDIA: '#3b82f6',
  BAIXA: '#94a3b8',
};

export type Barra = { rotulo: string; valor: number; cor: string };

export function porPrioridade(demandas: Demanda[]): Barra[] {
  const mapa = new Map<string, number>();
  for (const d of demandas) mapa.set(d.prioridade, (mapa.get(d.prioridade) ?? 0) + 1);

  return (Object.keys(PESO_PRIORIDADE) as Prioridade[])
    .sort((a, b) => PESO_PRIORIDADE[a] - PESO_PRIORIDADE[b])
    .map((p) => ({
      rotulo: ROTULO_PRIORIDADE[p],
      valor: mapa.get(p) ?? 0,
      cor: COR_PRIORIDADE_BARRA[p],
    }));
}

export type Responsavel = { id: string; nome: string; avatar?: string | null; valor: number };

/** Quem mais tem demandas no período, do maior para o menor. */
export function topResponsaveis(demandas: Demanda[], limite = 5): Responsavel[] {
  const mapa = new Map<string, Responsavel>();
  for (const d of demandas) {
    const atual = mapa.get(d.autorId);
    if (atual) atual.valor += 1;
    else mapa.set(d.autorId, { id: d.autorId, nome: d.autor.nome, valor: 1 });
  }
  return [...mapa.values()].sort((a, b) => b.valor - a.valor).slice(0, limite);
}

/** As demandas mexidas mais recentemente. */
export function recentes(demandas: Demanda[], limite = 5): Demanda[] {
  return [...demandas]
    .sort((a, b) => Date.parse(b.criadoEm) - Date.parse(a.criadoEm))
    .slice(0, limite);
}

/**
 * O que vence a seguir. Prioriza prazos de hoje em diante; só completa com
 * atrasadas (da mais recente) se sobrar espaço — senão o bloco viraria uma
 * lista de vencidas antigas, que já têm o seu lugar no alerta.
 */
export function proximosPrazos(demandas: Demanda[], hoje: string, limite = 5): Demanda[] {
  const abertas = demandas.filter((d) => d.status !== 'CONCLUIDA' && d.status !== 'CANCELADA');

  const aVencer = abertas
    .filter((d) => diaDe(d) >= hoje)
    .sort((a, b) => diaDe(a).localeCompare(diaDe(b)));

  if (aVencer.length >= limite) return aVencer.slice(0, limite);

  const vencidas = abertas
    .filter((d) => diaDe(d) < hoje)
    .sort((a, b) => diaDe(b).localeCompare(diaDe(a)));

  return [...aVencer, ...vencidas].slice(0, limite);
}

/* ══ Indicadores de desempenho ═══════════════════════════════════════════ */

/** Uma demanda conta para o desempenho quando já foi concluída ou já venceu. */
function apurada(d: Demanda, hoje: string): boolean {
  if (d.status === 'CANCELADA') return false;
  if (d.status === 'CONCLUIDA') return true;
  return diaDe(d) < hoje;
}

/** Concluída até o prazo. Sem data de conclusão, cai para o status. */
function noPrazo(d: Demanda): boolean {
  if (d.status !== 'CONCLUIDA') return false;
  if (!d.concluidaEm) return true;
  return d.concluidaEm.slice(0, 10) <= diaDe(d);
}

/** Dias entre o prazo e a conclusão (ou hoje, se ainda aberta). Zero se em dia. */
function diasDeAtraso(d: Demanda, hoje: string): number {
  const referencia = d.status === 'CONCLUIDA' && d.concluidaEm
    ? d.concluidaEm.slice(0, 10)
    : hoje;
  const atraso = Math.round(
    (Date.parse(`${referencia}T00:00:00Z`) - Date.parse(`${diaDe(d)}T00:00:00Z`)) / 86_400_000,
  );
  return atraso > 0 ? atraso : 0;
}

export type Desempenho = {
  /** Demandas que já podem ser julgadas (concluídas ou vencidas). */
  apuradas: number;
  concluidasNoPrazo: number;
  /** 0–100. Null quando não há base para julgar. */
  taxaCumprimento: number | null;
  taxaAtraso: number | null;
  /** Média de dias de atraso entre as que atrasaram. Null sem atrasos. */
  atrasoMedio: number | null;
  concluidas: number;
  total: number;
};

export function calcularDesempenho(demandas: Demanda[], hoje: string): Desempenho {
  const doPeriodo = demandas.filter((d) => d.status !== 'CANCELADA');
  const paraApurar = doPeriodo.filter((d) => apurada(d, hoje));
  const emDia = paraApurar.filter(noPrazo);

  const atrasadas = paraApurar.filter((d) => !noPrazo(d));
  const diasAtraso = atrasadas.map((d) => diasDeAtraso(d, hoje)).filter((n) => n > 0);

  const base = paraApurar.length;
  return {
    apuradas: base,
    concluidasNoPrazo: emDia.length,
    taxaCumprimento: base === 0 ? null : (emDia.length / base) * 100,
    taxaAtraso: base === 0 ? null : ((base - emDia.length) / base) * 100,
    atrasoMedio: diasAtraso.length === 0
      ? null
      : diasAtraso.reduce((s, n) => s + n, 0) / diasAtraso.length,
    concluidas: doPeriodo.filter((d) => d.status === 'CONCLUIDA').length,
    total: doPeriodo.length,
  };
}

/**
 * Radar Score: 0–100, resumindo a saúde da operação no período.
 *
 * Pesa o que o time controla: entregar no prazo (70%) e, quando atrasa,
 * atrasar pouco (30%). Um atraso médio de 5 dias ou mais zera essa segunda
 * parte — além disso a diferença deixa de ser informativa.
 */
export const PESO_CUMPRIMENTO = 0.7;
export const PESO_PONTUALIDADE = 0.3;
const ATRASO_TOLERADO = 5;

export function calcularScore(d: Desempenho): number | null {
  if (d.taxaCumprimento === null) return null;

  const cumprimento = d.taxaCumprimento / 100;
  // Sem atrasos, a pontualidade é perfeita.
  const atraso = d.atrasoMedio ?? 0;
  const pontualidade = Math.max(0, 1 - atraso / ATRASO_TOLERADO);

  return Math.round((cumprimento * PESO_CUMPRIMENTO + pontualidade * PESO_PONTUALIDADE) * 100);
}

export type FaixaScore = {
  rotulo: string;
  descricao: string;
  cor: string;
  /** Tom claro do rótulo, para o cartão escuro do celular. */
  corNoEscuro: string;
  fundo: string;
};

/** Leitura qualitativa do score, para o cartão não ser só um número. */
export function faixaDoScore(score: number): FaixaScore {
  if (score >= 85) {
    return {
      rotulo: 'Boa performance',
      descricao: 'Sua operação está saudável.',
      cor: '#16a34a', corNoEscuro: '#4ade80', fundo: '#22c55e',
    };
  }
  if (score >= 70) {
    return {
      rotulo: 'Desempenho regular',
      descricao: 'Há espaço para reduzir atrasos.',
      cor: '#0369a1', corNoEscuro: '#fde047', fundo: '#3b82f6',
    };
  }
  if (score >= 50) {
    return {
      rotulo: 'Atenção',
      descricao: 'Os atrasos estão pesando no período.',
      cor: '#b45309', corNoEscuro: '#fb923c', fundo: '#f59e0b',
    };
  }
  return {
    rotulo: 'Crítico',
    descricao: 'A maior parte das entregas saiu do prazo.',
    cor: '#b91c1c', corNoEscuro: '#f87171', fundo: '#ef4444',
  };
}

export type IndicadorDesempenho = {
  id: string;
  rotulo: string;
  /** Já formatado para a tela: "87,1%", "1,8 dias", "27 de 31". */
  valor: string;
  /** Variação contra o período anterior, já formatada. Null sem base. */
  variacao: string | null;
  /** Se a variação é boa (verde) ou ruim (vermelha). */
  variacaoBoa: boolean;
  /** Texto sob a variação. */
  rodape: string;
  tom: string;
};

const fmt1 = (n: number) => n.toFixed(1).replace('.', ',');

/**
 * Os quatro indicadores ao lado do score. Compara com a janela anterior de
 * mesmo tamanho, como os KPIs já fazem.
 */
export function indicadoresDesempenho(
  atual: Desempenho,
  anterior: Desempenho | null,
): IndicadorDesempenho[] {
  /** Diferença em pontos percentuais, com sinal. */
  const pp = (a: number | null, b: number | null | undefined) =>
    a === null || b === null || b === undefined ? null : a - b;

  const dCumpr = pp(atual.taxaCumprimento, anterior?.taxaCumprimento);
  const dAtraso = pp(atual.taxaAtraso, anterior?.taxaAtraso);
  const dDias =
    atual.atrasoMedio === null || anterior?.atrasoMedio === null || anterior?.atrasoMedio === undefined
      ? null
      : atual.atrasoMedio - anterior.atrasoMedio;
  const dConcl =
    anterior === null ? null : atual.concluidasNoPrazo - anterior.concluidasNoPrazo;

  return [
    {
      id: 'cumprimento',
      rotulo: 'Taxa de cumprimento',
      valor: atual.taxaCumprimento === null ? '—' : `${fmt1(atual.taxaCumprimento)}%`,
      variacao: dCumpr === null || Math.abs(dCumpr) < 0.05 ? null : `${dCumpr > 0 ? '↑' : '↓'} ${fmt1(Math.abs(dCumpr))} p.p.`,
      variacaoBoa: (dCumpr ?? 0) >= 0,
      rodape: 'vs. período anterior',
      tom: 'azul',
    },
    {
      id: 'atraso',
      rotulo: 'Taxa de atraso',
      valor: atual.taxaAtraso === null ? '—' : `${fmt1(atual.taxaAtraso)}%`,
      variacao: dAtraso === null || Math.abs(dAtraso) < 0.05 ? null : `${dAtraso > 0 ? '↑' : '↓'} ${fmt1(Math.abs(dAtraso))} p.p.`,
      // Aqui cair é bom: menos atraso.
      variacaoBoa: (dAtraso ?? 0) <= 0,
      rodape: 'vs. período anterior',
      tom: 'vermelho',
    },
    {
      id: 'atrasoMedio',
      // Rótulo curto: "Tempo médio de atraso" não cabe no cartão sem truncar.
      rotulo: 'Atraso médio',
      valor: atual.atrasoMedio === null ? '—' : `${fmt1(atual.atrasoMedio)} dias`,
      variacao: dDias === null || Math.abs(dDias) < 0.05 ? null : `${dDias > 0 ? '↑' : '↓'} ${fmt1(Math.abs(dDias))} dias`,
      variacaoBoa: (dDias ?? 0) <= 0,
      rodape: 'vs. período anterior',
      tom: 'roxo',
    },
    {
      id: 'noPrazo',
      rotulo: 'Demandas concluídas',
      valor: `${atual.concluidasNoPrazo} de ${atual.apuradas}`,
      variacao: null,
      variacaoBoa: (dConcl ?? 0) >= 0,
      // "+6 que no período anterior" deixa claro quem ganhou de quem.
      rodape: dConcl === null
        ? 'concluídas no prazo'
        : `${dConcl >= 0 ? '+' : ''}${dConcl} que no período anterior`,
      tom: 'verde',
    },
  ];
}

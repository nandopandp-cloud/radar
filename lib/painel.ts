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

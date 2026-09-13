import { diaParaDate, paraDiaISO, somarDias } from '@/lib/datas';

/**
 * Ofensiva Radar: dias seguidos em que a pessoa trabalhou no produto.
 *
 * Conta dias úteis. Sábado e domingo não somam nem quebram a sequência — num
 * escritório contábil, cobrar presença no fim de semana puniria o descanso.
 */

/** Sábado (6) e domingo (0) não entram na contagem. */
export function ehDiaUtil(dia: string): boolean {
  const semana = diaParaDate(dia).getUTCDay();
  return semana !== 0 && semana !== 6;
}

/** Dia útil anterior a este. */
export function diaUtilAnterior(dia: string): string {
  let anterior = somarDias(dia, -1);
  while (!ehDiaUtil(anterior)) anterior = somarDias(anterior, -1);
  return anterior;
}

export type Ofensiva = {
  /** Dias úteis seguidos com atividade, contando até hoje. */
  atual: number;
  /** Maior sequência já alcançada. */
  recorde: number;
  /** A pessoa já trabalhou hoje? */
  hojeConta: boolean;
  /** Total de dias ativos no histórico. */
  totalDias: number;
  /** Últimos dias úteis e se houve atividade em cada — para a tira do painel. */
  ultimos: { dia: string; ativo: boolean }[];
};

/**
 * Apura a ofensiva a partir dos dias registrados.
 *
 * A sequência atual só sobrevive se o último dia ativo for hoje ou o dia útil
 * anterior — assim quem trabalhou sexta ainda tem a sequência viva na segunda,
 * mas quem sumiu a semana toda volta do zero.
 */
export function apurarOfensiva(
  diasAtivos: string[],
  hoje = paraDiaISO(),
  janela = 7,
): Ofensiva {
  const conjunto = new Set(diasAtivos);
  const hojeConta = conjunto.has(hoje);

  // A partir de onde a sequência atual pode estar viva.
  let cursor: string;
  if (hojeConta) {
    cursor = hoje;
  } else {
    const anterior = diaUtilAnterior(hoje);
    // Sem atividade hoje nem no último dia útil, a sequência está quebrada.
    if (!conjunto.has(anterior)) {
      return {
        atual: 0,
        recorde: maiorSequencia(conjunto),
        hojeConta: false,
        totalDias: conjunto.size,
        ultimos: tira(conjunto, hoje, janela),
      };
    }
    cursor = anterior;
  }

  let atual = 0;
  while (conjunto.has(cursor)) {
    atual += 1;
    cursor = diaUtilAnterior(cursor);
  }

  return {
    atual,
    recorde: Math.max(atual, maiorSequencia(conjunto)),
    hojeConta,
    totalDias: conjunto.size,
    ultimos: tira(conjunto, hoje, janela),
  };
}

/** Maior sequência de dias úteis seguidos em todo o histórico. */
function maiorSequencia(conjunto: Set<string>): number {
  const uteis = [...conjunto].filter(ehDiaUtil).sort();
  let maior = 0;
  let corrente = 0;
  let anterior: string | null = null;

  for (const dia of uteis) {
    // Emenda com o anterior quando não há dia útil pulado entre os dois.
    corrente = anterior !== null && diaUtilAnterior(dia) === anterior ? corrente + 1 : 1;
    anterior = dia;
    if (corrente > maior) maior = corrente;
  }
  return maior;
}

/** Os últimos N dias úteis, do mais antigo ao mais recente. */
function tira(conjunto: Set<string>, hoje: string, quantos: number) {
  const dias: string[] = [];
  let cursor = ehDiaUtil(hoje) ? hoje : diaUtilAnterior(hoje);
  for (let i = 0; i < quantos; i += 1) {
    dias.push(cursor);
    cursor = diaUtilAnterior(cursor);
  }
  return dias.reverse().map((dia) => ({ dia, ativo: conjunto.has(dia) }));
}

/** Frase do widget: "12 dias no ritmo". */
export function rotuloOfensiva(o: Ofensiva): string {
  if (o.atual === 0) return 'Comece hoje';
  return o.atual === 1 ? '1 dia no ritmo' : `${o.atual} dias no ritmo`;
}

/** Marcos que valem comemorar, para a mensagem do painel. */
export function proximoMarco(atual: number): number | null {
  for (const marco of [3, 5, 10, 21, 30, 50, 100]) {
    if (atual < marco) return marco;
  }
  return null;
}

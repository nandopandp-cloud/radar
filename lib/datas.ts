/**
 * Utilitários de data. Todo o produto raciocina em "dia de trabalho" no fuso
 * de São Paulo, então normalizamos tudo para meia-noite local.
 */

export const TZ = process.env.SCHEDULER_TZ || 'America/Sao_Paulo';

/** Retorna "YYYY-MM-DD" do instante informado, no fuso do produto. */
export function paraDiaISO(data: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(data);
}

/** Converte "YYYY-MM-DD" em Date a meia-noite UTC — chave estável no banco. */
export function diaParaDate(dia: string): Date {
  return new Date(`${dia}T00:00:00.000Z`);
}

/** Hoje, como Date normalizado para gravar/comparar no banco. */
export function hojeNormalizado(): Date {
  return diaParaDate(paraDiaISO());
}

/** Soma (ou subtrai) dias de um "YYYY-MM-DD" sem sofrer com horário de verão. */
export function somarDias(dia: string, dias: number): string {
  const d = diaParaDate(dia);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Próximo dia útil (pula sábado e domingo). */
export function proximoDiaUtil(dia: string): string {
  let proximo = somarDias(dia, 1);
  // getUTCDay: 0 = domingo, 6 = sábado
  while ([0, 6].includes(diaParaDate(proximo).getUTCDay())) {
    proximo = somarDias(proximo, 1);
  }
  return proximo;
}

/** Formata "YYYY-MM-DD" como "sexta-feira, 05/09/2026". */
export function formatarDiaExtenso(dia: string): string {
  const d = diaParaDate(dia);
  const semana = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    weekday: 'long',
  }).format(d);
  const curto = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(d);
  return `${semana}, ${curto}`;
}

/** Formata "YYYY-MM-DD" como "05/09". */
export function formatarDiaCurto(dia: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
  }).format(diaParaDate(dia));
}

/** Formata "YYYY-MM-DD" como "05/09/2026" (dia completo, sem o dia da semana). */
export function formatarDiaCompleto(dia: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(diaParaDate(dia));
}

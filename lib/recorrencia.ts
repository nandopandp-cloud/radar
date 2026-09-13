import { diaParaDate, somarDias } from '@/lib/datas';

/** Cadências oferecidas no formulário. */
export const FREQUENCIAS = ['DIARIA', 'SEMANAL', 'MENSAL', 'PERSONALIZADA'] as const;
export type Frequencia = (typeof FREQUENCIAS)[number];

export const ROTULO_FREQUENCIA: Record<Frequencia, string> = {
  DIARIA: 'Diária',
  SEMANAL: 'Semanal',
  MENSAL: 'Mensal',
  // Rótulo curto: "Personalizada" não cabe no cartão sem truncar.
  PERSONALIZADA: 'Personalizar',
};

export const DESCRICAO_FREQUENCIA: Record<Frequencia, string> = {
  DIARIA: 'Todos os dias',
  SEMANAL: 'Toda semana',
  MENSAL: 'Todo mês',
  PERSONALIZADA: 'Definir regra',
};

/** Nomes curtos dos dias, indexados por getUTCDay(). */
export const NOMES_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Teto de ocorrências geradas de uma vez, para uma regra não explodir a agenda. */
export const MAXIMO_OCORRENCIAS = 500;

export type Regra = {
  frequencia: Frequencia;
  /** A cada N dias/semanas/meses. */
  intervalo: number;
  /** Dias da semana (0=domingo) quando a cadência é semanal. */
  diasSemana: number[];
  /** Dia do mês (1–31) quando a cadência é mensal. */
  diaDoMes: number | null;
  /** Empurra sábado/domingo para a segunda seguinte. */
  apenasDiasUteis: boolean;
  /** Primeiro dia da série, em YYYY-MM-DD. */
  inicio: string;
  /** Último dia aceito, em YYYY-MM-DD. Null = sem fim. */
  fim: string | null;
  /** Teto de ocorrências. Null = sem teto. */
  maximo: number | null;
};

export function ehFrequencia(v: unknown): v is Frequencia {
  return typeof v === 'string' && (FREQUENCIAS as readonly string[]).includes(v);
}

/** Último dia do mês de um par ano/mês (mês 0–11). */
function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
}

/** Move para a segunda-feira quando cai no fim de semana. */
function empurrarParaDiaUtil(dia: string): string {
  const semana = diaParaDate(dia).getUTCDay();
  if (semana === 6) return somarDias(dia, 2); // sábado
  if (semana === 0) return somarDias(dia, 1); // domingo
  return dia;
}

/**
 * Datas de uma regra, em ordem, a partir de `desde` (inclusive).
 *
 * É o coração da recorrência: tanto a prévia da tela quanto o cron que cria as
 * demandas leem daqui, para o que o usuário vê ser exatamente o que acontece.
 */
export function proximasDatas(regra: Regra, quantidade: number, desde?: string): string[] {
  const datas: string[] = [];
  if (quantidade <= 0) return datas;

  const intervalo = Math.max(1, Math.floor(regra.intervalo || 1));
  const limite = Math.min(quantidade, MAXIMO_OCORRENCIAS);
  const piso = desde && desde > regra.inicio ? desde : regra.inicio;

  const dentroDoFim = (dia: string) => !regra.fim || dia <= regra.fim;

  if (regra.frequencia === 'SEMANAL') {
    // Sem dia marcado, usa o dia da semana da data de início.
    const dias = regra.diasSemana.length > 0
      ? [...new Set(regra.diasSemana)].sort((a, b) => a - b)
      : [diaParaDate(regra.inicio).getUTCDay()];

    /*
     * Caminha semana a semana a partir do domingo da semana de início; o passo
     * `intervalo` pula semanas inteiras, então "a cada 2 semanas" não desalinha
     * quando um dos dias marcados cai antes do início.
     */
    const domingoInicial = somarDias(regra.inicio, -diaParaDate(regra.inicio).getUTCDay());
    for (let semana = 0; datas.length < limite; semana += 1) {
      if (semana > 5200) break; // ~100 anos: trava de segurança
      const base = somarDias(domingoInicial, semana * 7 * intervalo);
      for (const d of dias) {
        const bruto = somarDias(base, d);
        if (bruto < regra.inicio) continue;
        const dia = regra.apenasDiasUteis ? empurrarParaDiaUtil(bruto) : bruto;
        if (!dentroDoFim(dia)) return datas;
        if (dia >= piso && !datas.includes(dia)) datas.push(dia);
        if (datas.length >= limite) break;
      }
      if (regra.fim && somarDias(base, 6) > regra.fim) break;
    }
    return datas;
  }

  if (regra.frequencia === 'MENSAL') {
    const inicioData = diaParaDate(regra.inicio);
    // Sem dia definido, repete no mesmo dia do mês da data de início.
    const alvo = regra.diaDoMes ?? inicioData.getUTCDate();
    let ano = inicioData.getUTCFullYear();
    let mes = inicioData.getUTCMonth();

    for (let i = 0; datas.length < limite; i += 1) {
      if (i > 1200) break; // 100 anos
      // Meses curtos: fevereiro recebe o dia 28/29 quando a regra pede 30/31.
      const diaDoMes = Math.min(alvo, ultimoDiaDoMes(ano, mes));
      const bruto = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(diaDoMes).padStart(2, '0')}`;
      if (bruto >= regra.inicio) {
        const dia = regra.apenasDiasUteis ? empurrarParaDiaUtil(bruto) : bruto;
        if (!dentroDoFim(dia)) return datas;
        if (dia >= piso) datas.push(dia);
      }
      mes += intervalo;
      while (mes > 11) { mes -= 12; ano += 1; }
    }
    return datas;
  }

  // DIARIA e PERSONALIZADA caminham de N em N dias.
  let dia = regra.inicio;
  for (let i = 0; datas.length < limite; i += 1) {
    if (i > 36500) break; // 100 anos
    const ajustado = regra.apenasDiasUteis ? empurrarParaDiaUtil(dia) : dia;
    if (!dentroDoFim(ajustado)) break;
    if (ajustado >= piso && !datas.includes(ajustado)) datas.push(ajustado);
    dia = somarDias(dia, intervalo);
  }
  return datas;
}

/** Frase curta que resume a regra, para listas e para a gaveta da demanda. */
export function resumoDaRegra(regra: Regra): string {
  const n = Math.max(1, Math.floor(regra.intervalo || 1));

  if (regra.frequencia === 'DIARIA' || regra.frequencia === 'PERSONALIZADA') {
    const base = n === 1 ? 'Todos os dias' : `A cada ${n} dias`;
    return regra.apenasDiasUteis ? `${base}, só em dias úteis` : base;
  }

  if (regra.frequencia === 'SEMANAL') {
    const dias = [...new Set(regra.diasSemana)].sort((a, b) => a - b);
    const nomes = dias.length > 0
      ? dias.map((d) => NOMES_SEMANA[d]).join(', ')
      : NOMES_SEMANA[diaParaDate(regra.inicio).getUTCDay()];
    return n === 1 ? `Toda semana — ${nomes}` : `A cada ${n} semanas — ${nomes}`;
  }

  const dia = regra.diaDoMes ?? diaParaDate(regra.inicio).getUTCDate();
  return n === 1 ? `Todo mês, no dia ${dia}` : `A cada ${n} meses, no dia ${dia}`;
}

/** Valida a regra antes de gravar. */
export function validarRegra(regra: Regra): { ok: true } | { ok: false; erro: string } {
  if (!ehFrequencia(regra.frequencia)) {
    return { ok: false, erro: 'Escolha a frequência da recorrência.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(regra.inicio)) {
    return { ok: false, erro: 'Informe a data de início da recorrência.' };
  }
  if (regra.fim && !/^\d{4}-\d{2}-\d{2}$/.test(regra.fim)) {
    return { ok: false, erro: 'Informe uma data de término válida.' };
  }
  if (regra.fim && regra.fim < regra.inicio) {
    return { ok: false, erro: 'O término não pode ser antes do início.' };
  }
  if (regra.intervalo < 1 || regra.intervalo > 365) {
    return { ok: false, erro: 'O intervalo deve ficar entre 1 e 365.' };
  }
  if (regra.frequencia === 'MENSAL' && regra.diaDoMes !== null) {
    if (regra.diaDoMes < 1 || regra.diaDoMes > 31) {
      return { ok: false, erro: 'O dia do mês deve ficar entre 1 e 31.' };
    }
  }
  if (regra.frequencia === 'SEMANAL' && regra.diasSemana.some((d) => d < 0 || d > 6)) {
    return { ok: false, erro: 'Dia da semana inválido.' };
  }
  if (regra.maximo !== null && (regra.maximo < 1 || regra.maximo > MAXIMO_OCORRENCIAS)) {
    return { ok: false, erro: `O total de ocorrências deve ficar entre 1 e ${MAXIMO_OCORRENCIAS}.` };
  }
  // Uma regra que nunca produz data seria uma armadilha silenciosa.
  if (proximasDatas(regra, 1).length === 0) {
    return { ok: false, erro: 'Esta regra não gera nenhuma data. Revise o período.' };
  }
  return { ok: true };
}

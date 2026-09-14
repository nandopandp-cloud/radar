/**
 * Gamificação do perfil: XP, níveis, conquistas e missões.
 *
 * Os catálogos moram aqui, em código, e não no banco: título, meta e XP de
 * cada conquista/missão mudam com frequência e não valem uma migration. O
 * banco guarda só o que varia por pessoa — o XP acumulado, o que já foi
 * desbloqueado e o progresso de cada missão.
 *
 * Toda a apuração parte de números reais (dias ativos, ofensiva, demandas
 * concluídas), então o perfil evolui sozinho conforme a pessoa usa o Radar.
 */

/** Quanto XP cada nível exige. O nível N pede 500 XP acima do anterior. */
export const XP_POR_NIVEL = 500;

export type Nivel = {
  /** Nível atual, começando em 1. */
  nivel: number;
  /** XP já acumulado dentro do nível atual. */
  xpNoNivel: number;
  /** XP necessário para fechar o nível atual. */
  xpDoNivel: number;
  /** Quanto falta para o próximo nível. */
  falta: number;
  /** 0–100, para a barra de progresso. */
  progresso: number;
};

/** Converte o XP acumulado no nível e no quanto falta para o próximo. */
export function nivelDoXp(xp: number): Nivel {
  const total = Math.max(0, Math.floor(xp));
  const nivel = Math.floor(total / XP_POR_NIVEL) + 1;
  const xpNoNivel = total % XP_POR_NIVEL;
  return {
    nivel,
    xpNoNivel,
    xpDoNivel: XP_POR_NIVEL,
    falta: XP_POR_NIVEL - xpNoNivel,
    progresso: Math.round((xpNoNivel / XP_POR_NIVEL) * 100),
  };
}

/* ── Conquistas ──────────────────────────────────────────── */

/** Que número da pessoa a conquista observa. */
export type BaseConquista = 'ofensiva' | 'concluidas' | 'colaboracoes';

export type DefConquista = {
  chave: string;
  titulo: string;
  descricao: string;
  /** Ícone do catálogo de `icones.tsx`, resolvido na tela. */
  icone: 'chama' | 'calendario' | 'gota' | 'estrela' | 'check' | 'equipe' | 'alvo' | 'coroa';
  /** Cor do emblema quando desbloqueado. */
  tom: 'laranja' | 'ambar' | 'azul' | 'roxo' | 'verde';
  base: BaseConquista;
  /** Valor que precisa ser atingido. */
  meta: number;
};

/**
 * Catálogo de conquistas, na ordem em que aparecem na tela.
 *
 * A ordem importa: a Visão geral mostra só as cinco primeiras.
 */
export const CONQUISTAS: DefConquista[] = [
  {
    chave: 'primeiros-passos',
    titulo: 'Primeiros passos',
    descricao: 'Conclua sua primeira demanda no Radar.',
    icone: 'chama', tom: 'laranja', base: 'concluidas', meta: 1,
  },
  {
    chave: '5-dias',
    titulo: '5 dias seguidos',
    descricao: 'Mantenha sua ofensiva por 5 dias consecutivos.',
    icone: 'calendario', tom: 'ambar', base: 'ofensiva', meta: 5,
  },
  {
    chave: '10-dias',
    titulo: '10 dias seguidos',
    descricao: 'Mantenha sua ofensiva por 10 dias consecutivos.',
    icone: 'gota', tom: 'azul', base: 'ofensiva', meta: 10,
  },
  {
    chave: '25-dias',
    titulo: '25 dias seguidos',
    descricao: 'Mantenha sua ofensiva por 25 dias consecutivos.',
    icone: 'estrela', tom: 'roxo', base: 'ofensiva', meta: 25,
  },
  {
    chave: '50-concluidas',
    titulo: '50 demandas concluídas',
    descricao: 'Conclua 50 demandas no Radar.',
    icone: 'check', tom: 'verde', base: 'concluidas', meta: 50,
  },
  {
    chave: 'trabalho-em-equipe',
    titulo: 'Trabalho em equipe',
    descricao: 'Colabore em 10 demandas com o time.',
    icone: 'equipe', tom: 'azul', base: 'colaboracoes', meta: 10,
  },
  {
    chave: 'radar-master',
    titulo: 'Radar Master',
    descricao: 'Conclua 100 demandas no Radar.',
    icone: 'alvo', tom: 'roxo', base: 'concluidas', meta: 100,
  },
  {
    chave: 'ofensiva-lendaria',
    titulo: 'Ofensiva Lendária',
    descricao: 'Mantenha 30 dias de ofensiva consecutivos.',
    icone: 'coroa', tom: 'ambar', base: 'ofensiva', meta: 30,
  },
];

/** Os números da pessoa que alimentam conquistas e missões. */
export type NumerosDoUsuario = {
  /** Ofensiva atual, em dias úteis seguidos. */
  ofensiva: number;
  /** Maior ofensiva já alcançada — é o que vale para a conquista. */
  recordeOfensiva: number;
  /** Demandas concluídas no total. */
  concluidas: number;
  /** Demandas em que a pessoa comentou ou anexou algo. */
  colaboracoes: number;
};

export type EstadoConquista = 'conquistada' | 'progresso' | 'bloqueada';

export type ConquistaApurada = DefConquista & {
  estado: EstadoConquista;
  /** Quanto a pessoa tem hoje, limitado à meta. */
  atual: number;
  /** Data em que foi desbloqueada, ISO, quando já conquistada. */
  emQue: string | null;
};

/** O valor que a conquista observa, dado os números da pessoa. */
function valorDaBase(base: BaseConquista, n: NumerosDoUsuario): number {
  if (base === 'ofensiva') return n.recordeOfensiva;
  if (base === 'concluidas') return n.concluidas;
  return n.colaboracoes;
}

/**
 * Cruza o catálogo com os números reais e com o que já foi gravado.
 *
 * Uma conquista fica "em progresso" quando a pessoa já começou e está a menos
 * da metade do caminho restante — abaixo disso ela aparece bloqueada, para a
 * lista não virar um mural de barras quase vazias.
 */
export function apurarConquistas(
  numeros: NumerosDoUsuario,
  desbloqueadas: { chave: string; emQue: Date }[],
): ConquistaApurada[] {
  const porChave = new Map(desbloqueadas.map((c) => [c.chave, c.emQue]));

  return CONQUISTAS.map((def) => {
    const emQue = porChave.get(def.chave);
    const bruto = valorDaBase(def.base, numeros);
    const atual = Math.min(bruto, def.meta);

    if (emQue) {
      return { ...def, estado: 'conquistada' as const, atual: def.meta, emQue: emQue.toISOString() };
    }
    // Já engatou: mostra a barra de progresso.
    const estado: EstadoConquista = bruto > 0 && bruto >= def.meta * 0.2 ? 'progresso' : 'bloqueada';
    return { ...def, estado, atual, emQue: null };
  });
}

/** Chaves que a pessoa acabou de bater e ainda não estão gravadas. */
export function conquistasAGravar(
  numeros: NumerosDoUsuario,
  jaGravadas: string[],
): string[] {
  const gravadas = new Set(jaGravadas);
  return CONQUISTAS.filter(
    (def) => !gravadas.has(def.chave) && valorDaBase(def.base, numeros) >= def.meta,
  ).map((def) => def.chave);
}

/* ── Missões ─────────────────────────────────────────────── */

export type DefMissao = {
  chave: string;
  titulo: string;
  descricao: string;
  categoria: string;
  /** Tom da etiqueta de categoria. */
  tom: 'azul' | 'laranja' | 'roxo';
  icone: 'alvo' | 'chama' | 'grade';
  meta: number;
  xp: number;
  /** Texto do que falta, no plural do que a missão conta. */
  unidade: string;
};

/**
 * Catálogo de missões. Diferente das conquistas, que são marcos de uma vez
 * só, missões são desafios recorrentes — por isso o progresso vive no banco.
 */
export const MISSOES: DefMissao[] = [
  {
    chave: 'concluir-5-semana',
    titulo: 'Concluir 5 demandas esta semana',
    descricao: 'Mantenha sua produtividade em dia e ajude o time a avançar.',
    categoria: 'Produtividade', tom: 'azul', icone: 'alvo',
    meta: 5, xp: 50, unidade: 'demandas',
  },
  {
    chave: 'ofensiva-15',
    titulo: 'Manter 15 dias de ofensiva',
    descricao: 'A consistência gera grandes resultados.',
    categoria: 'Consistência', tom: 'laranja', icone: 'chama',
    meta: 15, xp: 100, unidade: 'dias',
  },
  {
    chave: 'explorar-tudo',
    titulo: 'Explorar todas as funcionalidades',
    descricao: 'Conheça o Radar por completo e descubra todo o seu potencial.',
    categoria: 'Exploração', tom: 'roxo', icone: 'grade',
    meta: 6, xp: 75, unidade: 'funcionalidades',
  },
];

export type MissaoApurada = DefMissao & {
  progresso: number;
  concluida: boolean;
  /** Quanto falta, já em texto pronto ("Faltam 3 dias para completar"). */
  restante: string | null;
};

/** Junta o catálogo com o progresso gravado de cada missão. */
export function apurarMissoes(
  gravadas: { chave: string; progresso: number; concluidaEm: Date | null }[],
): MissaoApurada[] {
  const porChave = new Map(gravadas.map((m) => [m.chave, m]));

  return MISSOES.map((def) => {
    const linha = porChave.get(def.chave);
    const progresso = Math.min(linha?.progresso ?? 0, def.meta);
    const concluida = linha?.concluidaEm != null || progresso >= def.meta;
    const falta = def.meta - progresso;

    return {
      ...def,
      progresso,
      concluida,
      restante: concluida || falta <= 0
        ? null
        : `Faltam ${falta} ${falta === 1 ? def.unidade.replace(/s$/, '') : def.unidade}`,
    };
  });
}

/**
 * Progresso de cada missão a partir dos números reais.
 *
 * "Explorar todas as funcionalidades" é a única que não sai de uma contagem
 * direta: ela soma marcos de uso do produto, contados em `lib/perfil.ts`.
 */
export function progressoDasMissoes(
  numeros: NumerosDoUsuario,
  concluidasNaSemana: number,
  funcionalidadesUsadas: number,
): Record<string, number> {
  return {
    'concluir-5-semana': concluidasNaSemana,
    'ofensiva-15': numeros.ofensiva,
    'explorar-tudo': funcionalidadesUsadas,
  };
}

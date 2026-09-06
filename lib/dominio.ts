export const PRIORIDADES = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'] as const;
export type Prioridade = (typeof PRIORIDADES)[number];

export const STATUS = ['ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'] as const;
export type Status = (typeof STATUS)[number];

export const ORIGENS = ['MANUAL', 'TEAMS', 'GOOGLE_CHAT'] as const;
export type Origem = (typeof ORIGENS)[number];

/** Status que ainda "contam" como trabalho pendente. */
export const STATUS_PENDENTES: Status[] = ['ABERTA', 'EM_ANDAMENTO'];

export const ROTULO_PRIORIDADE: Record<Prioridade, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
};

export const ROTULO_STATUS: Record<Status, string> = {
  ABERTA: 'Aberta',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

export const ROTULO_ORIGEM: Record<Origem, string> = {
  MANUAL: 'Manual',
  TEAMS: 'Teams',
  GOOGLE_CHAT: 'Google Chat',
};

/** Cores de cada prioridade — usadas na UI e no e-mail. */
export const COR_PRIORIDADE: Record<Prioridade, { fundo: string; texto: string; borda: string }> = {
  BAIXA: { fundo: '#eef2f7', texto: '#475569', borda: '#cbd5e1' },
  MEDIA: { fundo: '#e0f2fe', texto: '#0369a1', borda: '#7dd3fc' },
  ALTA: { fundo: '#fff1e0', texto: '#b45309', borda: '#fdba74' },
  CRITICA: { fundo: '#fee2e2', texto: '#b91c1c', borda: '#fca5a5' },
};

export const PESO_PRIORIDADE: Record<Prioridade, number> = {
  CRITICA: 0,
  ALTA: 1,
  MEDIA: 2,
  BAIXA: 3,
};

export function ehPrioridade(v: unknown): v is Prioridade {
  return typeof v === 'string' && (PRIORIDADES as readonly string[]).includes(v);
}

export function ehStatus(v: unknown): v is Status {
  return typeof v === 'string' && (STATUS as readonly string[]).includes(v);
}

export function ehOrigem(v: unknown): v is Origem {
  return typeof v === 'string' && (ORIGENS as readonly string[]).includes(v);
}

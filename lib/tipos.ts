export type UsuarioResumo = {
  id: string;
  nome: string;
  email: string;
  equipe: string | null;
};

export type Usuario = UsuarioResumo & {
  perfil: string;
  ativo: boolean;
  avatar?: string | null;
  criadoEm?: string;
  _count?: { demandas: number };
};

/** Vínculo da demanda com a regra que a criou, quando houver. */
export type RecorrenciaDaDemanda = {
  id: string;
  frequencia: string;
  intervalo: number;
  diaDoMes: number | null;
  diasSemana: number[];
  apenasDiasUteis: boolean;
  inicio: string;
  ativa: boolean;
};

export type Demanda = {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  status: string;
  origem: string;
  solicitante: string | null;
  categoria: string | null;
  inicio: string | null;
  prazo: string;
  concluidaEm: string | null;
  vezesAlertada: number;
  autorId: string;
  autor: UsuarioResumo;
  criadoEm: string;
  recorrenciaId?: string | null;
  recorrencia?: RecorrenciaDaDemanda | null;
};

export type SessaoUI = {
  id: string;
  nome: string;
  email: string;
  perfil: 'ANALISTA' | 'ADMIN';
  avatar?: string | null;
  /** Presente só quando um admin entrou nesta conta por link de acesso. */
  personificadoPor?: { id: string; nome: string } | null;
};


/** Metadados de um anexo. O conteúdo fica em /api/anexos/<id>. */
export type Anexo = {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  autorNome: string;
  criadoEm: string;
};

/**
 * Arquivo escolhido numa demanda que ainda não existe. Fica em memória até a
 * criação, quando vira Anexo de verdade — antes disso não há id para vinculá-lo.
 */
export type AnexoPendente = {
  nome: string;
  tipo: string;
  tamanho: number;
  conteudo: string;
};

/** Pessoa que pode ser marcada com @ — o recorte de /api/usuarios/mencionaveis. */
export type Mencionavel = {
  id: string;
  nome: string;
  avatar?: string | null;
};

export type Comentario = {
  id: string;
  texto: string;
  autorId: string | null;
  autorNome: string;
  criadoEm: string;
  autor?: { avatar?: string | null } | null;
  /** Quem foi marcado com @ neste comentário. */
  mencoes?: { usuario: { id: string; nome: string } }[];
};

export type Toast = { id: number; texto: string; tipo: 'ok' | 'erro' | 'info' };
export type Notificar = (texto: string, tipo?: Toast['tipo']) => void;

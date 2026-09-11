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
};

export type SessaoUI = {
  id: string;
  nome: string;
  email: string;
  perfil: 'ANALISTA' | 'ADMIN';
  avatar?: string | null;
};

export type Toast = { id: number; texto: string; tipo: 'ok' | 'erro' | 'info' };
export type Notificar = (texto: string, tipo?: Toast['tipo']) => void;

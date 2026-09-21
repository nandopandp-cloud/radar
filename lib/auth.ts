import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const COOKIE_SESSAO = 'radar_msa_sessao';
const DURACAO_HORAS = 12;

/**
 * Segredo de assinatura da sessão. Em produção exigimos AUTH_SECRET definido —
 * um segredo fixo no código permitiria forjar sessões.
 */
function segredo(): Uint8Array {
  const valor = process.env.AUTH_SECRET?.trim();
  if (!valor || valor.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET ausente ou muito curto (mínimo 32 caracteres).');
    }
    return new TextEncoder().encode('desenvolvimento-apenas-nao-use-em-producao-0123456789');
  }
  return new TextEncoder().encode(valor);
}

export type Sessao = {
  sub: string;
  email: string;
  nome: string;
  perfil: 'ANALISTA' | 'ADMIN';
  /**
   * Preenchido só em sessão aberta por link de acesso: quem é o admin por trás
   * da personificação. A sessão continua sendo a do usuário personificado —
   * `sub`, `perfil` e tudo mais são dele —, mas isto permite que a interface
   * avise e que a auditoria saiba quem realmente está agindo.
   */
  personificadoPor?: { id: string; nome: string };
};

export async function criarToken(
  sessao: Sessao,
  opcoes: { duracaoHoras?: number } = {},
): Promise<string> {
  return new SignJWT({
    email: sessao.email,
    nome: sessao.nome,
    perfil: sessao.perfil,
    ...(sessao.personificadoPor ? { pp: sessao.personificadoPor } : {}),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sessao.sub)
    .setIssuedAt()
    .setExpirationTime(`${opcoes.duracaoHoras ?? DURACAO_HORAS}h`)
    .sign(segredo());
}

export async function lerToken(token: string): Promise<Sessao | null> {
  try {
    const { payload } = await jwtVerify(token, segredo(), { algorithms: ['HS256'] });
    if (!payload.sub) return null;
    const pp = payload.pp as { id?: unknown; nome?: unknown } | undefined;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ''),
      nome: String(payload.nome ?? ''),
      perfil: payload.perfil === 'ADMIN' ? 'ADMIN' : 'ANALISTA',
      ...(pp && typeof pp.id === 'string'
        ? { personificadoPor: { id: pp.id, nome: String(pp.nome ?? '') } }
        : {}),
    };
  } catch {
    return null;
  }
}

/** Sessão atual a partir do cookie, ou null. Use em Server Components e rotas. */
export async function sessaoAtual(): Promise<Sessao | null> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  return token ? lerToken(token) : null;
}

export function opcoesCookie(maxAgeSegundos: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSegundos,
  };
}

export const DURACAO_SEGUNDOS = DURACAO_HORAS * 3600;

/**
 * Sessão de personificação dura bem menos que a normal: é para uma tarefa de
 * suporte pontual, não para o dia de trabalho. Expirada, o admin gera outro link.
 */
export const PERSONIFICACAO_HORAS = 1;
export const PERSONIFICACAO_SEGUNDOS = PERSONIFICACAO_HORAS * 3600;

/** Sessão exigida em rotas de API; lança 401 implicitamente ao retornar null. */
export async function exigirSessao(): Promise<Sessao | null> {
  return sessaoAtual();
}

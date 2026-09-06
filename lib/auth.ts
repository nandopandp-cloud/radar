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

export type Sessao = { sub: string; email: string; nome: string };

export async function criarToken(sessao: Sessao): Promise<string> {
  return new SignJWT({ email: sessao.email, nome: sessao.nome })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sessao.sub)
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_HORAS}h`)
    .sign(segredo());
}

export async function lerToken(token: string): Promise<Sessao | null> {
  try {
    const { payload } = await jwtVerify(token, segredo(), { algorithms: ['HS256'] });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ''),
      nome: String(payload.nome ?? ''),
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

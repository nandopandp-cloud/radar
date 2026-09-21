import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { BASE_URL } from '@/lib/email-base';

/** Janela de validade do link. Curta de propósito: é para uso imediato. */
export const VALIDADE_MINUTOS = 15;

/**
 * 32 bytes de aleatoriedade criptográfica em base64url — inadivinhável por
 * força bruta. `randomBytes` é o gerador do sistema, não `Math.random`.
 */
function gerarToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Só o hash vai para o banco. O token em claro existe no processo que o criou
 * e na URL que o admin copia; vazado o banco, nenhum link é reaproveitável.
 * SHA-256 sem sal basta aqui: a entrada já tem 256 bits de entropia, então
 * não há espaço de busca a proteger, diferente de uma senha escolhida por gente.
 */
function hashear(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export type LinkGerado = { url: string; expiraEm: Date; id: string };

/**
 * Cria um link de uso único para o admin entrar como `alvoId`.
 *
 * Invalida os links anteriores ainda pendentes para a mesma dupla: se o admin
 * gerou outro, o antigo não deveria continuar valendo por aí.
 */
export async function gerarLinkAcesso(opcoes: {
  adminId: string;
  alvoId: string;
}): Promise<LinkGerado> {
  const token = gerarToken();
  const expiraEm = new Date(Date.now() + VALIDADE_MINUTOS * 60_000);

  await prisma.linkAcesso.updateMany({
    where: {
      adminId: opcoes.adminId,
      alvoId: opcoes.alvoId,
      usadoEm: null,
      revogadoEm: null,
      expiraEm: { gt: new Date() },
    },
    data: { revogadoEm: new Date() },
  });

  const link = await prisma.linkAcesso.create({
    data: {
      tokenHash: hashear(token),
      adminId: opcoes.adminId,
      alvoId: opcoes.alvoId,
      expiraEm,
    },
    select: { id: true },
  });

  return {
    id: link.id,
    url: `${BASE_URL}/acesso/${token}`,
    expiraEm,
  };
}

export type ResgateOk = {
  ok: true;
  alvo: { id: string; nome: string; email: string; perfil: string; ativo: boolean };
  admin: { id: string; nome: string };
};
export type ResgateFalha = { ok: false; motivo: string };

/**
 * Valida e queima um link. Devolve quem personificar e quem está por trás.
 *
 * A marcação de uso é condicional (`usadoEm: null` no where): se dois cliques
 * chegarem juntos, só o primeiro atualiza uma linha e os demais falham, sem
 * depender de transação serializável.
 */
export async function resgatarLinkAcesso(
  token: string,
  ip: string | null,
): Promise<ResgateOk | ResgateFalha> {
  if (!token || token.length < 20) return { ok: false, motivo: 'Link inválido.' };

  const registro = await prisma.linkAcesso.findUnique({
    where: { tokenHash: hashear(token) },
    select: {
      id: true,
      expiraEm: true,
      usadoEm: true,
      revogadoEm: true,
      tokenHash: true,
      admin: { select: { id: true, nome: true, perfil: true, ativo: true } },
      alvo: { select: { id: true, nome: true, email: true, perfil: true, ativo: true } },
    },
  });

  if (!registro) return { ok: false, motivo: 'Link inválido ou já utilizado.' };

  // Comparação em tempo constante do hash, por rigor: a busca acima já é por
  // igualdade exata, mas isto evita depender do comportamento do índice.
  const esperado = Buffer.from(registro.tokenHash, 'utf8');
  const recebido = Buffer.from(hashear(token), 'utf8');
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) {
    return { ok: false, motivo: 'Link inválido ou já utilizado.' };
  }

  if (registro.revogadoEm) return { ok: false, motivo: 'Este link foi revogado.' };
  if (registro.usadoEm) return { ok: false, motivo: 'Este link já foi utilizado.' };
  if (registro.expiraEm < new Date()) return { ok: false, motivo: 'Este link expirou.' };

  // O poder do link vem de quem o gerou: se essa pessoa perdeu o perfil de
  // admin ou foi desativada, o link para de valer na hora.
  if (registro.admin.perfil !== 'ADMIN' || !registro.admin.ativo) {
    return { ok: false, motivo: 'Quem gerou este link não é mais administrador.' };
  }
  if (!registro.alvo.ativo) return { ok: false, motivo: 'Esta conta está desativada.' };

  const queimado = await prisma.linkAcesso.updateMany({
    where: { id: registro.id, usadoEm: null },
    data: { usadoEm: new Date(), usadoIp: ip ?? undefined },
  });
  if (queimado.count === 0) return { ok: false, motivo: 'Este link já foi utilizado.' };

  return { ok: true, alvo: registro.alvo, admin: registro.admin };
}

import { prisma } from '@/lib/prisma';
import { sessaoAtual, type Sessao } from '@/lib/auth';

/** Quem colabora, na ordem em que foi adicionado — o formato que a tela usa. */
export const SELECAO_COLABORADORES = {
  select: { usuario: { select: { id: true, nome: true } } },
  orderBy: { criadoEm: 'asc' as const },
};

export type Negado = { erro: string; codigo: 401 | 403 | 404 };

/**
 * Quem pode abrir uma demanda: o responsável, os colaboradores, qualquer admin
 * e quem foi mencionado em algum comentário dela — o mesmo recorte que a
 * listagem já aplica, mais o convite implícito que a menção representa. Anexos
 * e comentários herdam essa regra, para nada ficar visível por um caminho que
 * a lista não mostraria.
 *
 * A menção concede acesso porque o e-mail de "você foi mencionado" leva a um
 * link da demanda; sem isso ele terminaria num 403. Apagado o comentário que
 * continha a menção, o acesso vai junto.
 *
 * `participa` separa quem trabalha na demanda (admin, responsável e
 * colaboradores, que podem editá-la) de quem só foi mencionado e apenas lê.
 */
export async function acessoADemanda(
  id: string,
): Promise<{ ok: true; sessao: Sessao; autorId: string; participa: boolean } | Negado> {
  const sessao = await sessaoAtual();
  if (!sessao) return { erro: 'Não autenticado.', codigo: 401 };

  const demanda = await prisma.demanda.findUnique({
    where: { id },
    select: { autorId: true, colaboradores: { where: { usuarioId: sessao.sub }, select: { usuarioId: true } } },
  });
  if (!demanda) return { erro: 'Demanda não encontrada.', codigo: 404 };

  const participa =
    sessao.perfil === 'ADMIN' || demanda.autorId === sessao.sub || demanda.colaboradores.length > 0;

  if (!participa) {
    const mencionado = await prisma.mencao.findFirst({
      where: { usuarioId: sessao.sub, comentario: { demandaId: id } },
      select: { id: true },
    });
    if (!mencionado) return { erro: 'Esta demanda não é sua.', codigo: 403 };
  }
  return { ok: true, sessao, autorId: demanda.autorId, participa };
}

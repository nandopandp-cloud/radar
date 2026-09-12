import { prisma } from '@/lib/prisma';
import { sessaoAtual, type Sessao } from '@/lib/auth';

export type Negado = { erro: string; codigo: 401 | 403 | 404 };

/**
 * Quem pode abrir uma demanda: o autor e qualquer admin — o mesmo recorte que
 * a listagem já aplica. Anexos e comentários herdam essa regra, para nada
 * ficar visível por um caminho que a lista não mostraria.
 */
export async function acessoADemanda(
  id: string,
): Promise<{ ok: true; sessao: Sessao; autorId: string } | Negado> {
  const sessao = await sessaoAtual();
  if (!sessao) return { erro: 'Não autenticado.', codigo: 401 };

  const demanda = await prisma.demanda.findUnique({
    where: { id },
    select: { autorId: true },
  });
  if (!demanda) return { erro: 'Demanda não encontrada.', codigo: 404 };

  if (sessao.perfil !== 'ADMIN' && demanda.autorId !== sessao.sub) {
    return { erro: 'Esta demanda não é sua.', codigo: 403 };
  }
  return { ok: true, sessao, autorId: demanda.autorId };
}

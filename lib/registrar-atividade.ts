import { prisma } from '@/lib/prisma';
import { diaParaDate, paraDiaISO } from '@/lib/datas';

/**
 * Marca que a pessoa trabalhou hoje, alimentando a Ofensiva Radar.
 *
 * Chamada pelas rotas de ação (criar, editar, concluir, comentar, anexar).
 * É idempotente pela chave única (usuário, dia): a primeira ação do dia cria a
 * linha, as seguintes só incrementam o contador.
 *
 * Nunca lança: a ofensiva é um extra, e falhar aqui não pode derrubar a ação
 * que a pessoa realmente pediu.
 */
export async function registrarAtividade(usuarioId: string): Promise<void> {
  try {
    const dia = diaParaDate(paraDiaISO());
    await prisma.diaAtivo.upsert({
      where: { usuarioId_dia: { usuarioId, dia } },
      create: { usuarioId, dia, acoes: 1 },
      update: { acoes: { increment: 1 } },
    });
  } catch {
    // Silencioso de propósito — ver o comentário acima.
  }
}

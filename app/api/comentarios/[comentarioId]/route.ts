import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { acessoADemanda } from '@/lib/acesso';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ comentarioId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const { comentarioId } = await params;

  const comentario = await prisma.comentario.findUnique({
    where: { id: comentarioId },
    select: { demandaId: true, autorId: true },
  });
  if (!comentario) {
    return NextResponse.json({ erro: 'Comentário não encontrado.' }, { status: 404 });
  }

  const check = await acessoADemanda(comentario.demandaId);
  if ('erro' in check) return NextResponse.json({ erro: check.erro }, { status: check.codigo });

  // Cada um apaga o próprio comentário; o admin modera qualquer um.
  const podeApagar =
    check.sessao.perfil === 'ADMIN' || comentario.autorId === check.sessao.sub;
  if (!podeApagar) {
    return NextResponse.json({ erro: 'Você não pode remover este comentário.' }, { status: 403 });
  }

  await prisma.comentario.delete({ where: { id: comentarioId } });
  return NextResponse.json({ ok: true });
}

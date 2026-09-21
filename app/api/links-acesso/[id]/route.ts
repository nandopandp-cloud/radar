import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessaoAtual } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Revoga um link ainda não usado.
 *
 * Sem botão na interface hoje (o painel de histórico saiu da Equipe), mas é a
 * saída para um link que tenha vazado antes de expirar.
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  if (sessao.perfil !== 'ADMIN' || sessao.personificadoPor) {
    return NextResponse.json({ erro: 'Apenas administradores.' }, { status: 403 });
  }

  const { id } = await params;
  const atualizado = await prisma.linkAcesso.updateMany({
    where: { id, usadoEm: null, revogadoEm: null },
    data: { revogadoEm: new Date() },
  });

  if (atualizado.count === 0) {
    return NextResponse.json(
      { erro: 'Este link já foi usado, revogado ou não existe.' },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}

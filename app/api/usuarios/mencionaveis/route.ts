import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessaoAtual } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Quem pode ser marcado com @ num comentário: todas as contas ativas.
 *
 * Existe separada de /api/usuarios — que é exclusiva de admins — porque devolve
 * um recorte mínimo: id, nome e avatar, o necessário para desenhar a lista.
 * E-mail, perfil, equipe e carga de trabalho ficam de fora, que é justamente
 * o motivo de a outra rota ser restrita.
 */
export async function GET() {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });

  const usuarios = await prisma.usuario.findMany({
    where: { ativo: true },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true, avatar: true },
  });

  return NextResponse.json(usuarios);
}

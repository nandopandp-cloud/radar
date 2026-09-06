import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessaoAtual } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Histórico de alertas. Analista vê os seus; admin vê os de todos. */
export async function GET(req: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limite = Math.min(Number(searchParams.get('limite') || 25), 100);

  const alertas = await prisma.alerta.findMany({
    where: sessao.perfil === 'ADMIN' ? {} : { usuarioId: sessao.sub },
    orderBy: { enviadoEm: 'desc' },
    take: limite,
    select: {
      id: true,
      email: true,
      dataReferencia: true,
      qtdDemandas: true,
      status: true,
      detalhe: true,
      assunto: true,
      enviadoEm: true,
      // corpoHtml fica de fora: é grande e serve pela rota de preview.
      usuarioId: true,
      usuario: { select: { nome: true } },
    },
  });

  return NextResponse.json(
    alertas.map((a) => ({
      ...a,
      nome: a.usuario?.nome ?? a.email,
      temPrevia: a.status === 'PREVIEW',
    })),
  );
}

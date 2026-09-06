import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Histórico de alertas disparados, do mais recente para o mais antigo. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limite = Math.min(Number(searchParams.get('limite') || 25), 100);

  const alertas = await prisma.alerta.findMany({
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
      colaboradorId: true,
    },
  });

  const colaboradores = await prisma.colaborador.findMany({
    where: { id: { in: [...new Set(alertas.map((a) => a.colaboradorId))] } },
    select: { id: true, nome: true },
  });
  const nomePorId = new Map(colaboradores.map((c) => [c.id, c.nome]));

  return NextResponse.json(
    alertas.map((a) => ({
      ...a,
      nome: nomePorId.get(a.colaboradorId) ?? a.email,
      temPrevia: a.status === 'PREVIEW',
    })),
  );
}

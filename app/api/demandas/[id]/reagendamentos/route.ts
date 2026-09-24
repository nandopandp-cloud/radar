import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { acessoADemanda } from '@/lib/acesso';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Histórico de trocas da data de entrega. Só admin: é a ferramenta para
 * enxergar quem adia prazo na véspera, não uma informação do dia a dia.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const check = await acessoADemanda(id);
  if ('erro' in check) return NextResponse.json({ erro: check.erro }, { status: check.codigo });
  if (check.sessao.perfil !== 'ADMIN') {
    return NextResponse.json({ erro: 'Apenas admins veem o histórico de prazos.' }, { status: 403 });
  }

  const historico = await prisma.reagendamento.findMany({
    where: { demandaId: id },
    select: {
      id: true, prazoAnterior: true, prazoNovo: true, diasAntes: true,
      usuarioNome: true, perfil: true, personificadoPor: true, criadoEm: true,
    },
    orderBy: { criadoEm: 'desc' },
  });
  return NextResponse.json(historico);
}

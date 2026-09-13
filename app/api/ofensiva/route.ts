import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessaoAtual } from '@/lib/auth';
import { paraDiaISO, somarDias, diaParaDate } from '@/lib/datas';
import { apurarOfensiva } from '@/lib/ofensiva';

export const dynamic = 'force-dynamic';

/** Quanto histórico buscar. 120 dias cobre a maior sequência plausível. */
const JANELA_DIAS = 120;

/** A Ofensiva Radar de quem está logado. */
export async function GET() {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });

  const hoje = paraDiaISO();
  const registros = await prisma.diaAtivo.findMany({
    where: {
      usuarioId: sessao.sub,
      dia: { gte: diaParaDate(somarDias(hoje, -JANELA_DIAS)) },
    },
    select: { dia: true },
    orderBy: { dia: 'asc' },
  });

  const dias = registros.map((r) => r.dia.toISOString().slice(0, 10));
  return NextResponse.json(apurarOfensiva(dias, hoje));
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { diaParaDate } from '@/lib/datas';
import { ehPrioridade, ehStatus } from '@/lib/dominio';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const corpo = await req.json().catch(() => null);
  if (!corpo) return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 });

  const dados: Record<string, unknown> = {};

  if (typeof corpo.titulo === 'string' && corpo.titulo.trim()) dados.titulo = corpo.titulo.trim();
  if (typeof corpo.descricao === 'string') dados.descricao = corpo.descricao.trim() || null;
  if (typeof corpo.solicitante === 'string') dados.solicitante = corpo.solicitante.trim() || null;
  if (ehPrioridade(corpo.prioridade)) dados.prioridade = corpo.prioridade;
  if (typeof corpo.colaboradorId === 'string' && corpo.colaboradorId) {
    dados.colaboradorId = corpo.colaboradorId;
  }
  if (typeof corpo.dataPrevista === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(corpo.dataPrevista)) {
    dados.dataPrevista = diaParaDate(corpo.dataPrevista);
  }
  if (ehStatus(corpo.status)) {
    dados.status = corpo.status;
    // Concluir/reabrir precisa manter concluidaEm coerente.
    dados.concluidaEm = corpo.status === 'CONCLUIDA' ? new Date() : null;
  }

  try {
    const demanda = await prisma.demanda.update({
      where: { id },
      data: dados,
      include: { colaborador: true },
    });
    return NextResponse.json(demanda);
  } catch {
    return NextResponse.json({ erro: 'Demanda não encontrada.' }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    await prisma.demanda.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: 'Demanda não encontrada.' }, { status: 404 });
  }
}

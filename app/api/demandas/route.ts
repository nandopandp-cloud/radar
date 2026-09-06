import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { diaParaDate, paraDiaISO } from '@/lib/datas';
import { ehOrigem, ehPrioridade, ehStatus } from '@/lib/dominio';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const colaboradorId = searchParams.get('colaboradorId');

  const demandas = await prisma.demanda.findMany({
    where: {
      ...(status && ehStatus(status) ? { status } : {}),
      ...(colaboradorId ? { colaboradorId } : {}),
    },
    include: { colaborador: true },
    orderBy: [{ dataPrevista: 'asc' }, { criadoEm: 'desc' }],
  });

  return NextResponse.json(demandas);
}

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => null);
  if (!corpo) return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 });

  const titulo = String(corpo.titulo ?? '').trim();
  const colaboradorId = String(corpo.colaboradorId ?? '').trim();

  if (!titulo) return NextResponse.json({ erro: 'Informe o título da demanda.' }, { status: 400 });
  if (!colaboradorId) {
    return NextResponse.json({ erro: 'Selecione o colaborador responsável.' }, { status: 400 });
  }

  const colaborador = await prisma.colaborador.findUnique({ where: { id: colaboradorId } });
  if (!colaborador) {
    return NextResponse.json({ erro: 'Colaborador não encontrado.' }, { status: 404 });
  }

  const prioridade = ehPrioridade(corpo.prioridade) ? corpo.prioridade : 'MEDIA';
  const status = ehStatus(corpo.status) ? corpo.status : 'ABERTA';
  const origem = ehOrigem(corpo.origem) ? corpo.origem : 'MANUAL';

  const dia = String(corpo.dataPrevista ?? '').trim();
  const diaValido = /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : paraDiaISO();

  const demanda = await prisma.demanda.create({
    data: {
      titulo,
      descricao: String(corpo.descricao ?? '').trim() || null,
      solicitante: String(corpo.solicitante ?? '').trim() || null,
      prioridade,
      status,
      origem,
      dataPrevista: diaParaDate(diaValido),
      colaboradorId,
    },
    include: { colaborador: true },
  });

  return NextResponse.json(demanda, { status: 201 });
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const colaboradores = await prisma.colaborador.findMany({
    orderBy: { nome: 'asc' },
    include: { _count: { select: { demandas: true } } },
  });
  return NextResponse.json(colaboradores);
}

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => null);
  if (!corpo) return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 });

  const nome = String(corpo.nome ?? '').trim();
  const email = String(corpo.email ?? '').trim().toLowerCase();
  const equipe = String(corpo.equipe ?? '').trim() || null;

  if (!nome) return NextResponse.json({ erro: 'Informe o nome.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ erro: 'E-mail inválido.' }, { status: 400 });
  }

  const jaExiste = await prisma.colaborador.findUnique({ where: { email } });
  if (jaExiste) {
    return NextResponse.json({ erro: 'Já existe um colaborador com este e-mail.' }, { status: 409 });
  }

  const colaborador = await prisma.colaborador.create({ data: { nome, email, equipe } });
  return NextResponse.json(colaborador, { status: 201 });
}

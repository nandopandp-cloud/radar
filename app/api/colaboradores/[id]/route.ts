import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const corpo = await req.json().catch(() => null);
  if (!corpo) return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 });

  const dados: Record<string, unknown> = {};
  if (typeof corpo.nome === 'string' && corpo.nome.trim()) dados.nome = corpo.nome.trim();
  if (typeof corpo.equipe === 'string') dados.equipe = corpo.equipe.trim() || null;
  if (typeof corpo.ativo === 'boolean') dados.ativo = corpo.ativo;
  if (typeof corpo.email === 'string') {
    const email = corpo.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ erro: 'E-mail inválido.' }, { status: 400 });
    }
    dados.email = email;
  }

  try {
    const colaborador = await prisma.colaborador.update({ where: { id }, data: dados });
    return NextResponse.json(colaborador);
  } catch {
    return NextResponse.json({ erro: 'Colaborador não encontrado.' }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    await prisma.colaborador.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: 'Colaborador não encontrado.' }, { status: 404 });
  }
}

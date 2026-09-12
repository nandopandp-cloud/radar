import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { acessoADemanda } from '@/lib/acesso';

export const dynamic = 'force-dynamic';

/** Teto de um comentário, para não virar campo de texto ilimitado. */
const TAMANHO_MAXIMO = 4000;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const check = await acessoADemanda(id);
  if ('erro' in check) return NextResponse.json({ erro: check.erro }, { status: check.codigo });

  const comentarios = await prisma.comentario.findMany({
    where: { demandaId: id },
    select: {
      id: true, texto: true, autorId: true, autorNome: true, criadoEm: true,
      autor: { select: { avatar: true } },
    },
    orderBy: { criadoEm: 'asc' },
  });
  return NextResponse.json(comentarios);
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const check = await acessoADemanda(id);
  if ('erro' in check) return NextResponse.json({ erro: check.erro }, { status: check.codigo });

  const corpo = await req.json().catch(() => null);
  if (!corpo) return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 });

  const texto = String(corpo.texto ?? '').trim();
  if (!texto) return NextResponse.json({ erro: 'Escreva algo antes de enviar.' }, { status: 400 });
  if (texto.length > TAMANHO_MAXIMO) {
    return NextResponse.json(
      { erro: `O comentário pode ter no máximo ${TAMANHO_MAXIMO} caracteres.` },
      { status: 400 },
    );
  }

  const comentario = await prisma.comentario.create({
    data: {
      demandaId: id,
      texto,
      autorId: check.sessao.sub,
      autorNome: check.sessao.nome,
    },
    select: {
      id: true, texto: true, autorId: true, autorNome: true, criadoEm: true,
      autor: { select: { avatar: true } },
    },
  });
  return NextResponse.json(comentario, { status: 201 });
}

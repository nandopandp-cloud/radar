import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessaoAtual } from '@/lib/auth';
import { MAXIMO_POR_DEMANDA, validarAnexo } from '@/lib/anexos';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Anexos do molde. Recebe os lotes que não couberam na criação da regra —
 * vários arquivos de 1MB em base64 estouram o corpo de uma requisição só.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });

  const regra = await prisma.recorrencia.findUnique({
    where: { id },
    select: { autorId: true },
  });
  if (!regra) return NextResponse.json({ erro: 'Recorrência não encontrada.' }, { status: 404 });
  if (sessao.perfil !== 'ADMIN' && regra.autorId !== sessao.sub) {
    return NextResponse.json({ erro: 'Esta recorrência não é sua.' }, { status: 403 });
  }

  const corpo = await req.json().catch(() => null);
  if (!corpo) return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 });

  const lista = Array.isArray(corpo.anexos) ? corpo.anexos : [corpo];
  const validos = [];
  for (const entrada of lista) {
    const resultado = validarAnexo(entrada);
    if (!resultado.ok) return NextResponse.json({ erro: resultado.erro }, { status: 400 });
    validos.push(resultado.valor);
  }

  const jaTem = await prisma.anexoRecorrencia.count({ where: { recorrenciaId: id } });
  if (jaTem + validos.length > MAXIMO_POR_DEMANDA) {
    return NextResponse.json(
      { erro: `Cada demanda aceita no máximo ${MAXIMO_POR_DEMANDA} anexos.` },
      { status: 400 },
    );
  }

  await prisma.anexoRecorrencia.createMany({
    data: validos.map((a) => ({ recorrenciaId: id, ...a })),
  });

  const anexos = await prisma.anexoRecorrencia.findMany({
    where: { recorrenciaId: id },
    select: { id: true, nome: true, tipo: true, tamanho: true, criadoEm: true },
    orderBy: { criadoEm: 'asc' },
  });
  return NextResponse.json(anexos, { status: 201 });
}

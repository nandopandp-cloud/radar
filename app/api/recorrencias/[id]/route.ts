import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessaoAtual } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** Mesma regra das demandas: analista mexe no que é dele, admin em tudo. */
async function permitido(id: string) {
  const sessao = await sessaoAtual();
  if (!sessao) return { erro: 'Não autenticado.', codigo: 401 as const };

  const regra = await prisma.recorrencia.findUnique({
    where: { id },
    select: { autorId: true },
  });
  if (!regra) return { erro: 'Recorrência não encontrada.', codigo: 404 as const };

  if (sessao.perfil !== 'ADMIN' && regra.autorId !== sessao.sub) {
    return { erro: 'Esta recorrência não é sua.', codigo: 403 as const };
  }
  return { ok: true as const, sessao };
}

/** Hoje só pausa e retoma — o resto da regra se altera recriando. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const check = await permitido(id);
  if ('erro' in check) return NextResponse.json({ erro: check.erro }, { status: check.codigo });

  const corpo = await req.json().catch(() => null);
  if (!corpo) return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 });

  const dados: Record<string, unknown> = {};
  if (typeof corpo.ativa === 'boolean') dados.ativa = corpo.ativa;
  if (Object.keys(dados).length === 0) {
    return NextResponse.json({ erro: 'Nada para atualizar.' }, { status: 400 });
  }

  const regra = await prisma.recorrencia.update({ where: { id }, data: dados });
  return NextResponse.json(regra);
}

/**
 * Apaga a regra. As demandas já criadas ficam — o vínculo é SetNull, então o
 * histórico do time continua intacto.
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const check = await permitido(id);
  if ('erro' in check) return NextResponse.json({ erro: check.erro }, { status: check.codigo });

  await prisma.recorrencia.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

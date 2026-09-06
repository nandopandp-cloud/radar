import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { COOKIE_SESSAO, opcoesCookie, sessaoAtual } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Troca a senha do próprio usuário. Exige a senha atual — sem isso, uma sessão
 * esquecida aberta permitiria a qualquer um assumir a conta em definitivo.
 */
export async function POST(req: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });

  const corpo = await req.json().catch(() => null);
  if (!corpo) return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 });

  const atual = String(corpo.atual ?? '');
  const nova = String(corpo.nova ?? '');

  if (!atual || !nova) {
    return NextResponse.json({ erro: 'Informe a senha atual e a nova.' }, { status: 400 });
  }
  if (nova.length < 6) {
    return NextResponse.json(
      { erro: 'A nova senha precisa de ao menos 6 caracteres.' },
      { status: 400 },
    );
  }
  if (nova === atual) {
    return NextResponse.json({ erro: 'A nova senha é igual à atual.' }, { status: 400 });
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: sessao.sub } });
  if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado.' }, { status: 404 });

  if (!(await bcrypt.compare(atual, usuario.senhaHash))) {
    return NextResponse.json({ erro: 'A senha atual está incorreta.' }, { status: 403 });
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { senhaHash: await bcrypt.hash(nova, 10) },
  });

  // Encerra a sessão: trocar a senha deve exigir novo login.
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SESSAO, '', opcoesCookie(0));
  return res;
}

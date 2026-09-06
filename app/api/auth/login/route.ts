import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { COOKIE_SESSAO, DURACAO_SEGUNDOS, criarToken, opcoesCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => null);
  if (!corpo) return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 });

  const email = String(corpo.email ?? '').trim().toLowerCase();
  const senha = String(corpo.senha ?? '');

  if (!email || !senha) {
    return NextResponse.json({ erro: 'Informe e-mail e senha.' }, { status: 400 });
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });

  // Mensagem única para e-mail inexistente e senha errada: não revelamos
  // quais e-mails existem. O compare roda mesmo sem usuário para manter o
  // tempo de resposta parecido.
  const hash = usuario?.senhaHash ?? '$2b$10$invalidoinvalidoinvalidoinvalidoinvalidoinvalidoinvalido';
  const confere = await bcrypt.compare(senha, hash);

  if (!usuario || !confere) {
    return NextResponse.json({ erro: 'E-mail ou senha incorretos.' }, { status: 401 });
  }

  const token = await criarToken({
    sub: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
  });

  const res = NextResponse.json({ ok: true, nome: usuario.nome });
  res.cookies.set(COOKIE_SESSAO, token, opcoesCookie(DURACAO_SEGUNDOS));
  return res;
}

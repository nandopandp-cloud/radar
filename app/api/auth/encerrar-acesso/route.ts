import { NextResponse } from 'next/server';
import { COOKIE_SESSAO, opcoesCookie, sessaoAtual } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Encerra uma sessão de personificação.
 *
 * Não devolve o admin à própria conta automaticamente: a sessão dele foi
 * substituída pelo cookie do link, e recriá-la aqui significaria emitir um
 * token de admin sem ninguém provar identidade. Ele faz login de novo.
 */
export async function POST() {
  const sessao = await sessaoAtual();
  if (!sessao?.personificadoPor) {
    return NextResponse.json({ erro: 'Não há sessão de acesso ativa.' }, { status: 400 });
  }

  console.warn(
    `[link-acesso] ${sessao.personificadoPor.nome} encerrou o acesso à conta de ${sessao.nome}`,
  );

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SESSAO, '', opcoesCookie(0));
  return res;
}

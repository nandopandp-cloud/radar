import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_SESSAO, lerToken } from '@/lib/auth';

/**
 * Protege todo o app. Rotas públicas: a tela de login e sua API.
 *
 * O endpoint de disparo é exceção porque o agendador externo o chama sem
 * cookie — ele tem sua própria proteção por CRON_SECRET.
 */
const PUBLICAS = ['/login', '/api/auth/login'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return NextResponse.next();
  }

  /*
   * Rotas do agendador: chegam sem cookie de sessão e se autenticam sozinhas
   * por CRON_SECRET. O middleware só confere que veio algum segredo — a
   * validação real acontece dentro da rota, que compara com a variável.
   *
   * /api/cron/disparo é chamada pelo Vercel Cron (sempre GET);
   * /api/disparo aceita POST de agendadores externos.
   */
  const rotaDeAgendador =
    pathname === '/api/cron/disparo' ||
    (pathname === '/api/disparo' && req.method === 'POST');

  if (rotaDeAgendador) {
    const temSegredo =
      req.headers.get('authorization') || req.headers.get('x-cron-secret');
    if (temSegredo) return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_SESSAO)?.value;
  const sessao = token ? await lerToken(token) : null;

  if (sessao) return NextResponse.next();

  // APIs respondem 401; páginas redirecionam para o login.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('de', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  /*
   * Tudo, menos os assets estáticos. As imagens de public/ precisam ficar de
   * fora: o e-mail carrega a logo sem sessão, e o favicon é pedido antes do login.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$).*)',
  ],
};

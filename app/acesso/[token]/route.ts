import { NextResponse, type NextRequest } from 'next/server';
import {
  COOKIE_SESSAO,
  PERSONIFICACAO_HORAS,
  PERSONIFICACAO_SEGUNDOS,
  criarToken,
  opcoesCookie,
} from '@/lib/auth';
import { resgatarLinkAcesso } from '@/lib/link-acesso';
import { paginaRecusa } from '@/lib/pagina-acesso';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ token: string }> };

/**
 * Resgate do link de acesso: valida o token, queima-o e troca a sessão atual
 * pela do usuário personificado.
 *
 * É um Route Handler, e não uma página, por uma razão dura do Next: um Server
 * Component não pode escrever cookies — só Route Handlers e Server Actions.
 * Tentar isso lança "Cookies can only be modified in a Server Action or Route
 * Handler" e a pessoa vê um erro 500 genérico.
 *
 * Mesmo sendo uma rota, ela responde HTML na recusa: quem abre isto é uma
 * pessoa colando um link no navegador, não um programa esperando JSON.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { token } = await params;

  /*
   * Prefetch não pode queimar o link. Navegadores e o próprio Next buscam
   * páginas antes do clique; como o resgate consome um token de uso único,
   * uma busca especulativa gastaria o link e a pessoa encontraria "já
   * utilizado" ao chegar de verdade.
   */
  const h = req.headers;
  const especulativo =
    h.get('purpose') === 'prefetch' ||
    h.get('x-purpose') === 'preview' ||
    h.get('sec-purpose')?.includes('prefetch') ||
    h.get('next-router-prefetch') === '1';

  if (especulativo) {
    return new NextResponse(paginaRecusa('Abrindo…', ''), {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null;

  const resultado = await resgatarLinkAcesso(decodeURIComponent(token), ip);

  if (!resultado.ok) {
    return new NextResponse(
      paginaRecusa(
        'Link não utilizável',
        resultado.motivo,
        'Peça um link novo ao administrador — cada um vale 15 minutos e só pode ser usado uma vez.',
      ),
      { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }

  const jwt = await criarToken(
    {
      sub: resultado.alvo.id,
      email: resultado.alvo.email,
      nome: resultado.alvo.nome,
      perfil: resultado.alvo.perfil === 'ADMIN' ? 'ADMIN' : 'ANALISTA',
      personificadoPor: { id: resultado.admin.id, nome: resultado.admin.nome },
    },
    { duracaoHoras: PERSONIFICACAO_HORAS },
  );

  // O cookie vai na própria resposta de redirecionamento — o caminho que o
  // Next permite e que o login normal já usa.
  const res = NextResponse.redirect(new URL('/', req.url));
  res.cookies.set(COOKIE_SESSAO, jwt, opcoesCookie(PERSONIFICACAO_SEGUNDOS));
  return res;
}

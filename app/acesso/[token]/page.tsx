import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  COOKIE_SESSAO,
  PERSONIFICACAO_HORAS,
  PERSONIFICACAO_SEGUNDOS,
  criarToken,
  opcoesCookie,
} from '@/lib/auth';
import { resgatarLinkAcesso } from '@/lib/link-acesso';

export const dynamic = 'force-dynamic';

/**
 * Resgate do link de acesso. Abrir esta página queima o link e troca a sessão
 * atual pela do usuário personificado.
 *
 * É um Server Component, e não uma rota de API, para que o admin simplesmente
 * cole a URL no navegador e caia dentro do Radar já personificado.
 */
export default async function ResgatarAcesso({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const cabecalhos = await headers();
  const ip =
    cabecalhos.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    cabecalhos.get('x-real-ip') ||
    null;

  /*
   * Prefetch não pode queimar o link. Navegadores e o próprio Next buscam
   * páginas antes do clique; como abrir esta aqui consome o token de uso único,
   * uma busca especulativa gastaria o link e a pessoa encontraria "já
   * utilizado" ao chegar de verdade. Esses pedidos se anunciam nestes
   * cabeçalhos, e para eles não resgatamos nada.
   */
  const especulativo =
    cabecalhos.get('purpose') === 'prefetch' ||
    cabecalhos.get('x-purpose') === 'preview' ||
    cabecalhos.get('sec-purpose')?.includes('prefetch') ||
    cabecalhos.get('next-router-prefetch') === '1';

  if (especulativo) {
    return (
      <main className="acesso-aviso">
        <div className="cartao acesso-cartao">
          <h1 className="acesso-titulo">Abrindo…</h1>
        </div>
      </main>
    );
  }

  const resultado = await resgatarLinkAcesso(decodeURIComponent(token), ip);

  if (!resultado.ok) {
    return (
      <main className="acesso-aviso">
        <div className="cartao acesso-cartao">
          <h1 className="acesso-titulo">Link não utilizável</h1>
          <p className="acesso-texto">{resultado.motivo}</p>
          <p className="acesso-texto acesso-dica">
            Peça um link novo ao administrador — cada um vale por{' '}
            {PERSONIFICACAO_HORAS === 1 ? 'pouco tempo' : 'alguns minutos'} e só pode
            ser usado uma vez.
          </p>
          <a className="btn btn-primario" href="/login">Ir para o login</a>
        </div>
      </main>
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

  (await cookies()).set(COOKIE_SESSAO, jwt, opcoesCookie(PERSONIFICACAO_SEGUNDOS));
  redirect('/');
}

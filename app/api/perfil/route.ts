import { NextResponse } from 'next/server';
import { sessaoAtual } from '@/lib/auth';
import { carregarPerfil } from '@/lib/perfil';

export const dynamic = 'force-dynamic';

/** Tabela ausente no Postgres: a migration da gamificação não foi aplicada. */
const TABELA_AUSENTE = 'P2021';

/**
 * Perfil gamificado de quem está logado: XP, conquistas, missões e evolução.
 *
 * A gamificação é exclusiva dos analistas — para o admin a rota recusa, em vez
 * de criar linhas de progresso para alguém que não participa.
 */
export async function GET() {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  if (sessao.perfil === 'ADMIN') {
    return NextResponse.json({ erro: 'A gamificação é exclusiva dos analistas.' }, { status: 403 });
  }

  try {
    return NextResponse.json(await carregarPerfil(sessao.sub));
  } catch (erro) {
    /* O deploy da Vercel não aplica migrations (veja o README). Se as tabelas
       da gamificação ainda não existem, devolve um erro que diz o que fazer em
       vez do erro cru do Prisma. */
    if (typeof erro === 'object' && erro !== null && 'code' in erro && erro.code === TABELA_AUSENTE) {
      console.error('Gamificação sem migration aplicada. Rode scripts/aplicar-migration.sh --aplicar');
      return NextResponse.json(
        { erro: 'A gamificação ainda não foi liberada neste ambiente.' },
        { status: 503 },
      );
    }
    throw erro;
  }
}

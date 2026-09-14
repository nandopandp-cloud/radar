import { NextResponse } from 'next/server';
import { sessaoAtual } from '@/lib/auth';
import { carregarPerfil } from '@/lib/perfil';

export const dynamic = 'force-dynamic';

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

  return NextResponse.json(await carregarPerfil(sessao.sub));
}

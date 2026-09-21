import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessaoAtual } from '@/lib/auth';
import { gerarLinkAcesso, VALIDADE_MINUTOS } from '@/lib/link-acesso';

export const dynamic = 'force-dynamic';

/**
 * Só admin, e nunca em sessão personificada — senão quem entrou por um link
 * poderia gerar outros e a cadeia de responsabilidade se perderia.
 */
async function exigirAdminReal() {
  const sessao = await sessaoAtual();
  if (!sessao) return { erro: 'Não autenticado.', codigo: 401 as const };
  if (sessao.perfil !== 'ADMIN') {
    return { erro: 'Apenas administradores geram links de acesso.', codigo: 403 as const };
  }
  if (sessao.personificadoPor) {
    return {
      erro: 'Não é possível gerar links durante uma sessão de acesso. Saia primeiro.',
      codigo: 403 as const,
    };
  }
  return { ok: true as const, sessao };
}

/** Histórico recente, para o admin ver o que gerou e revogar o que ainda vale. */
export async function GET() {
  const check = await exigirAdminReal();
  if ('erro' in check) return NextResponse.json({ erro: check.erro }, { status: check.codigo });

  const links = await prisma.linkAcesso.findMany({
    orderBy: { criadoEm: 'desc' },
    take: 30,
    select: {
      id: true,
      criadoEm: true,
      expiraEm: true,
      usadoEm: true,
      usadoIp: true,
      revogadoEm: true,
      admin: { select: { id: true, nome: true } },
      alvo: { select: { id: true, nome: true } },
    },
  });

  return NextResponse.json(links);
}

export async function POST(req: Request) {
  const check = await exigirAdminReal();
  if ('erro' in check) return NextResponse.json({ erro: check.erro }, { status: check.codigo });

  const corpo = await req.json().catch(() => null);
  const alvoId = String(corpo?.alvoId ?? '').trim();
  if (!alvoId) return NextResponse.json({ erro: 'Escolha o usuário.' }, { status: 400 });

  if (alvoId === check.sessao.sub) {
    return NextResponse.json(
      { erro: 'Você já está na sua própria conta.' },
      { status: 400 },
    );
  }

  const alvo = await prisma.usuario.findUnique({
    where: { id: alvoId },
    select: { id: true, nome: true, ativo: true },
  });
  if (!alvo) return NextResponse.json({ erro: 'Usuário não encontrado.' }, { status: 404 });
  if (!alvo.ativo) {
    return NextResponse.json({ erro: 'Esta conta está desativada.' }, { status: 400 });
  }

  const link = await gerarLinkAcesso({ adminId: check.sessao.sub, alvoId: alvo.id });

  /*
   * A URL é montada com a origem desta requisição, não com uma base fixa: o
   * app responde por mais de um domínio na Vercel, e um link apontando para o
   * domínio "errado" sofreria um 307 entre domínios. Como a página de resgate
   * queima o token ao ser lida, esse redirect consumiria o link antes de a
   * pessoa chegar — o sintoma de "gerei o link e ele não funciona".
   */
  const origem = new URL(req.url).origin;
  const url = `${origem}${link.caminho}`;

  // O token em claro aparece só aqui, nesta resposta. Depois disso, o banco
  // guarda apenas o hash e não há como recuperá-lo.
  console.warn(
    `[link-acesso] ${check.sessao.nome} (${check.sessao.sub}) gerou link para ` +
      `${alvo.nome} (${alvo.id}), expira ${link.expiraEm.toISOString()}`,
  );

  return NextResponse.json(
    { url, expiraEm: link.expiraEm, validadeMinutos: VALIDADE_MINUTOS, alvo: alvo.nome },
    { status: 201 },
  );
}

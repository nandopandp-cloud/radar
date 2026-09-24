import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { acessoADemanda } from '@/lib/acesso';
import { ehTipoPerigoso } from '@/lib/anexos';
import { apagarSeOrfao } from '@/lib/anexos-servidor';
import { linkDeLeitura } from '@/lib/r2';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ anexoId: string }> };

/**
 * Confere a permissão e redireciona para um link curto do R2. Tipos ativos
 * (html, svg, xml, js) descem como octet-stream e sempre como download.
 */
export async function GET(req: Request, { params }: Ctx) {
  const { anexoId } = await params;

  const anexo = await prisma.anexo.findUnique({
    where: { id: anexoId },
    select: { demandaId: true, nome: true, tipo: true, chave: true },
  });
  if (!anexo) return NextResponse.json({ erro: 'Anexo não encontrado.' }, { status: 404 });

  // A permissão é a da demanda a que ele pertence.
  const check = await acessoADemanda(anexo.demandaId);
  if ('erro' in check) return NextResponse.json({ erro: check.erro }, { status: check.codigo });

  const perigoso = ehTipoPerigoso(anexo.tipo);
  // ?baixar=1 força o download; sem ele, tipos inertes podem abrir em nova aba.
  const baixar = new URL(req.url).searchParams.get('baixar') === '1';
  const disposicao = baixar || perigoso ? 'attachment' : 'inline';

  const url = await linkDeLeitura(anexo.chave, {
    tipo: perigoso ? 'application/octet-stream' : anexo.tipo,
    // RFC 5987: o nome pode ter acento, que não cabe no cabeçalho em latin-1.
    disposicao: `${disposicao}; filename*=UTF-8''${encodeURIComponent(anexo.nome)}`,
  });

  const resposta = NextResponse.redirect(url, 302);
  resposta.headers.set('cache-control', 'private, no-store');
  return resposta;
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { anexoId } = await params;

  const anexo = await prisma.anexo.findUnique({
    where: { id: anexoId },
    select: { demandaId: true, autorId: true, chave: true },
  });
  if (!anexo) return NextResponse.json({ erro: 'Anexo não encontrado.' }, { status: 404 });

  const check = await acessoADemanda(anexo.demandaId);
  if ('erro' in check) return NextResponse.json({ erro: check.erro }, { status: check.codigo });

  // Remove quem anexou, o dono da demanda ou um admin.
  const dono =
    check.sessao.perfil === 'ADMIN' ||
    anexo.autorId === check.sessao.sub ||
    check.autorId === check.sessao.sub;
  if (!dono) {
    return NextResponse.json({ erro: 'Você não pode remover este anexo.' }, { status: 403 });
  }

  await prisma.anexo.delete({ where: { id: anexoId } });
  // Se o R2 falhar aqui, a limpeza diária do cron apaga o arquivo depois.
  await apagarSeOrfao(anexo.chave).catch((e) => console.error('[anexos] R2:', e));
  return NextResponse.json({ ok: true });
}

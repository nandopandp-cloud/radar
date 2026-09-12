import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { acessoADemanda } from '@/lib/acesso';
import { ehTipoPerigoso } from '@/lib/anexos';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ anexoId: string }> };

/**
 * Entrega o arquivo. Como qualquer formato é aceito, o conteúdo nunca é
 * servido de um jeito que o navegador possa executar na origem do Radar:
 * tipos ativos (html, svg, xml, js) descem como octet-stream, e tudo vai com
 * Content-Disposition e nosniff. Sem isso, um .html anexado viraria XSS.
 */
export async function GET(req: Request, { params }: Ctx) {
  const { anexoId } = await params;

  const anexo = await prisma.anexo.findUnique({
    where: { id: anexoId },
    select: { demandaId: true, nome: true, tipo: true, conteudo: true },
  });
  if (!anexo) return NextResponse.json({ erro: 'Anexo não encontrado.' }, { status: 404 });

  // A permissão é a da demanda a que ele pertence.
  const check = await acessoADemanda(anexo.demandaId);
  if ('erro' in check) return NextResponse.json({ erro: check.erro }, { status: check.codigo });

  const base64 = anexo.conteudo.slice(anexo.conteudo.indexOf(',') + 1);
  const bytes = Buffer.from(base64, 'base64');

  const seguro = ehTipoPerigoso(anexo.tipo) ? 'application/octet-stream' : anexo.tipo;
  // ?baixar=1 força o download; sem ele, tipos inertes podem abrir em nova aba.
  const baixar = new URL(req.url).searchParams.get('baixar') === '1';
  const disposicao = baixar || ehTipoPerigoso(anexo.tipo) ? 'attachment' : 'inline';

  // RFC 5987: o nome pode ter acento, que não cabe no cabeçalho em latin-1.
  const nomeCodificado = encodeURIComponent(anexo.nome);

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'content-type': seguro,
      'content-length': String(bytes.length),
      'content-disposition': `${disposicao}; filename*=UTF-8''${nomeCodificado}`,
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox",
      // Conteúdo privado: não pode ficar em cache compartilhado.
      'cache-control': 'private, max-age=0, must-revalidate',
    },
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { anexoId } = await params;

  const anexo = await prisma.anexo.findUnique({
    where: { id: anexoId },
    select: { demandaId: true, autorId: true },
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
  return NextResponse.json({ ok: true });
}

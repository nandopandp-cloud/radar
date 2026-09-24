import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { acessoADemanda } from '@/lib/acesso';
import { MAXIMO_POR_DEMANDA } from '@/lib/anexos';
import { confirmarAnexos } from '@/lib/anexos-servidor';
import { registrarAtividade } from '@/lib/registrar-atividade';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Lista os anexos da demanda. O conteúdo em si não vem aqui — só os metadados,
 * senão a gaveta baixaria megabytes só para desenhar a lista. O arquivo é
 * buscado sob demanda em /api/anexos/<id>.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const check = await acessoADemanda(id);
  if ('erro' in check) return NextResponse.json({ erro: check.erro }, { status: check.codigo });

  const anexos = await prisma.anexo.findMany({
    where: { demandaId: id },
    select: { id: true, nome: true, tipo: true, tamanho: true, autorNome: true, criadoEm: true },
    orderBy: { criadoEm: 'asc' },
  });
  return NextResponse.json(anexos);
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const check = await acessoADemanda(id);
  if ('erro' in check) return NextResponse.json({ erro: check.erro }, { status: check.codigo });

  const corpo = await req.json().catch(() => null);
  if (!corpo) return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 });

  // Os arquivos já estão no R2 (via /api/anexos/envio); aqui só são registrados.
  const lista: unknown[] = Array.isArray(corpo.anexos) ? corpo.anexos : [];
  if (lista.length === 0) {
    return NextResponse.json({ erro: 'Nenhum arquivo enviado.' }, { status: 400 });
  }

  const jaTem = await prisma.anexo.count({ where: { demandaId: id } });
  if (jaTem + lista.length > MAXIMO_POR_DEMANDA) {
    return NextResponse.json(
      { erro: `Cada demanda aceita no máximo ${MAXIMO_POR_DEMANDA} anexos.` },
      { status: 400 },
    );
  }

  const confirmados = await confirmarAnexos(lista, check.sessao.sub);
  if (!confirmados.ok) return NextResponse.json({ erro: confirmados.erro }, { status: 400 });

  await prisma.anexo.createMany({
    data: confirmados.valor.map((a) => ({
      demandaId: id,
      nome: a.nome,
      tipo: a.tipo,
      tamanho: a.tamanho,
      chave: a.chave,
      autorId: check.sessao.sub,
      autorNome: check.sessao.nome,
    })),
  });

  const anexos = await prisma.anexo.findMany({
    where: { demandaId: id },
    select: { id: true, nome: true, tipo: true, tamanho: true, autorNome: true, criadoEm: true },
    orderBy: { criadoEm: 'asc' },
  });
  await registrarAtividade(check.sessao.sub);
  return NextResponse.json(anexos, { status: 201 });
}

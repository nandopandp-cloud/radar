import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { acessoADemanda } from '@/lib/acesso';
import { MAXIMO_POR_DEMANDA, validarAnexo } from '@/lib/anexos';
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

  // Aceita um anexo ou vários de uma vez, para o envio múltiplo da gaveta.
  const lista = Array.isArray(corpo.anexos) ? corpo.anexos : [corpo];
  if (lista.length === 0) {
    return NextResponse.json({ erro: 'Nenhum arquivo enviado.' }, { status: 400 });
  }

  const validos = [];
  for (const entrada of lista) {
    const resultado = validarAnexo(entrada);
    if (!resultado.ok) return NextResponse.json({ erro: resultado.erro }, { status: 400 });
    validos.push(resultado.valor);
  }

  const jaTem = await prisma.anexo.count({ where: { demandaId: id } });
  if (jaTem + validos.length > MAXIMO_POR_DEMANDA) {
    return NextResponse.json(
      { erro: `Cada demanda aceita no máximo ${MAXIMO_POR_DEMANDA} anexos.` },
      { status: 400 },
    );
  }

  await prisma.anexo.createMany({
    data: validos.map((a) => ({
      demandaId: id,
      nome: a.nome,
      tipo: a.tipo,
      tamanho: a.tamanho,
      conteudo: a.conteudo,
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

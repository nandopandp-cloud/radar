import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { acessoADemanda } from '@/lib/acesso';
import { notificarComentario } from '@/lib/notificar-comentario';
import { registrarAtividade } from '@/lib/registrar-atividade';

export const dynamic = 'force-dynamic';

/** Teto de um comentário, para não virar campo de texto ilimitado. */
const TAMANHO_MAXIMO = 4000;

/** Teto de menções por comentário, para o aviso não virar disparo em massa. */
const MAXIMO_MENCOES = 20;

/** O que a lista de comentários devolve — inclui quem foi marcado com @. */
const SELECAO = {
  id: true,
  texto: true,
  autorId: true,
  autorNome: true,
  criadoEm: true,
  autor: { select: { avatar: true } },
  mencoes: {
    select: { usuario: { select: { id: true, nome: true } } },
  },
} as const;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const check = await acessoADemanda(id);
  if ('erro' in check) return NextResponse.json({ erro: check.erro }, { status: check.codigo });

  const comentarios = await prisma.comentario.findMany({
    where: { demandaId: id },
    select: SELECAO,
    orderBy: { criadoEm: 'asc' },
  });
  return NextResponse.json(comentarios);
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const check = await acessoADemanda(id);
  if ('erro' in check) return NextResponse.json({ erro: check.erro }, { status: check.codigo });

  const corpo = await req.json().catch(() => null);
  if (!corpo) return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 });

  const texto = String(corpo.texto ?? '').trim();
  if (!texto) return NextResponse.json({ erro: 'Escreva algo antes de enviar.' }, { status: 400 });
  if (texto.length > TAMANHO_MAXIMO) {
    return NextResponse.json(
      { erro: `O comentário pode ter no máximo ${TAMANHO_MAXIMO} caracteres.` },
      { status: 400 },
    );
  }

  // As menções chegam como ids, escolhidos no seletor — nunca extraídos do
  // texto no servidor. Nomes se repetem e mudam; id não. Passamos pelo banco
  // porque o cliente pode mandar qualquer coisa: só id de conta ativa vale.
  const pedidos: string[] = Array.isArray(corpo.mencionados)
    ? [
        ...new Set<string>(
          corpo.mencionados.filter((m: unknown): m is string => typeof m === 'string'),
        ),
      ]
    : [];
  if (pedidos.length > MAXIMO_MENCOES) {
    return NextResponse.json(
      { erro: `Você pode mencionar no máximo ${MAXIMO_MENCOES} pessoas por comentário.` },
      { status: 400 },
    );
  }

  const mencionadosIds =
    pedidos.length > 0
      ? (
          await prisma.usuario.findMany({
            where: { id: { in: pedidos }, ativo: true },
            select: { id: true },
          })
        ).map((u) => u.id)
      : [];

  const demanda = await prisma.demanda.findUnique({
    where: { id },
    select: { id: true, titulo: true, autorId: true },
  });
  if (!demanda) return NextResponse.json({ erro: 'Demanda não encontrada.' }, { status: 404 });

  const comentario = await prisma.comentario.create({
    data: {
      demandaId: id,
      texto,
      autorId: check.sessao.sub,
      autorNome: check.sessao.nome,
      mencoes: { create: mencionadosIds.map((usuarioId) => ({ usuarioId })) },
    },
    select: SELECAO,
  });
  await registrarAtividade(check.sessao.sub);

  // O comentário já está gravado: um provedor de e-mail fora do ar não pode
  // derrubar a resposta. `notificarComentario` engole e registra as falhas.
  await notificarComentario({
    comentarioId: comentario.id,
    demanda,
    texto,
    autorNome: check.sessao.nome,
    autorId: check.sessao.sub,
    mencionadosIds,
  });

  return NextResponse.json(comentario, { status: 201 });
}

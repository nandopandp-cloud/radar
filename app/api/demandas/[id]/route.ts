import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessaoAtual } from '@/lib/auth';
import { diaParaDate, paraDiaISO } from '@/lib/datas';
import { diasEntre, prazoTravado } from '@/lib/prazo';
import { ehPrioridade, ehStatus } from '@/lib/dominio';
import { registrarAtividade } from '@/lib/registrar-atividade';
import { SELECAO_COLABORADORES } from '@/lib/acesso';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Admin mexe em tudo. Analista edita o que é dele ou onde é colaborador, mas
 * só exclui o que é dele: o colaborador foi chamado para ajudar, não para
 * decidir se a demanda existe.
 */
async function permitido(id: string, acao: 'editar' | 'excluir') {
  const sessao = await sessaoAtual();
  if (!sessao) return { erro: 'Não autenticado.', codigo: 401 as const };

  const demanda = await prisma.demanda.findUnique({
    where: { id },
    select: {
      autorId: true, inicio: true, prazo: true,
      colaboradores: { select: { usuarioId: true } },
    },
  });
  if (!demanda) return { erro: 'Demanda não encontrada.', codigo: 404 as const };

  const dono = demanda.autorId === sessao.sub;
  const colabora = demanda.colaboradores.some((c) => c.usuarioId === sessao.sub);
  if (sessao.perfil !== 'ADMIN' && !dono && !(acao === 'editar' && colabora)) {
    return {
      erro: colabora ? 'Só o responsável ou um admin pode excluir esta demanda.' : 'Esta demanda não é sua.',
      codigo: 403 as const,
    };
  }
  return { ok: true as const, demanda, sessao };
}

/** Confere que os ids são de contas ativas; devolve só os válidos, sem repetir. */
async function contasAtivas(ids: string[]): Promise<string[]> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return [];
  const achados = await prisma.usuario.findMany({
    where: { id: { in: unicos }, ativo: true },
    select: { id: true },
  });
  return achados.map((u) => u.id);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const check = await permitido(id, 'editar');
  if ('erro' in check) return NextResponse.json({ erro: check.erro }, { status: check.codigo });

  const corpo = await req.json().catch(() => null);
  if (!corpo) return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 });

  /*
   * Atribuição: trocar o responsável e escolher colaboradores é decisão de
   * admin. Analista que tente pelo corpo da requisição recebe 403, não um
   * silêncio que pareça ter funcionado.
   */
  const mexeNaAtribuicao = 'autorId' in corpo || 'colaboradores' in corpo;
  if (mexeNaAtribuicao && check.sessao.perfil !== 'ADMIN') {
    return NextResponse.json(
      { erro: 'Só um admin pode trocar o responsável ou os colaboradores.' },
      { status: 403 },
    );
  }

  let novoAutorId: string | null = null;
  if ('autorId' in corpo) {
    if (typeof corpo.autorId !== 'string' || !corpo.autorId) {
      return NextResponse.json({ erro: 'Escolha o novo responsável.' }, { status: 400 });
    }
    const [valido] = await contasAtivas([corpo.autorId]);
    if (!valido) {
      return NextResponse.json({ erro: 'Esse usuário não existe ou está inativo.' }, { status: 400 });
    }
    if (valido !== check.demanda.autorId) novoAutorId = valido;
  }

  let novosColaboradores: string[] | null = null;
  if ('colaboradores' in corpo) {
    if (!Array.isArray(corpo.colaboradores) || corpo.colaboradores.some((c: unknown) => typeof c !== 'string')) {
      return NextResponse.json({ erro: 'Lista de colaboradores inválida.' }, { status: 400 });
    }
    novosColaboradores = await contasAtivas(corpo.colaboradores);
  }

  const dados: Record<string, unknown> = {};
  if (typeof corpo.titulo === 'string' && corpo.titulo.trim()) dados.titulo = corpo.titulo.trim();
  if (typeof corpo.descricao === 'string') dados.descricao = corpo.descricao.trim() || null;
  if (typeof corpo.solicitante === 'string') dados.solicitante = corpo.solicitante.trim() || null;
  if (typeof corpo.categoria === 'string') dados.categoria = corpo.categoria.trim() || null;
  if (ehPrioridade(corpo.prioridade)) dados.prioridade = corpo.prioridade;
  if (typeof corpo.prazo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(corpo.prazo)) {
    dados.prazo = diaParaDate(corpo.prazo);
  }
  // String vazia limpa a data de início; uma data válida a substitui.
  if (typeof corpo.inicio === 'string') {
    if (!corpo.inicio.trim()) {
      dados.inicio = null;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(corpo.inicio)) {
      dados.inicio = diaParaDate(corpo.inicio);
    } else {
      return NextResponse.json({ erro: 'Informe uma data de início válida.' }, { status: 400 });
    }
  }
  if (ehStatus(corpo.status)) {
    dados.status = corpo.status;
    dados.concluidaEm = corpo.status === 'CONCLUIDA' ? new Date() : null;
  }
  // Compara o par final — início e prazo podem vir em edições separadas.
  const inicioFinal = 'inicio' in dados ? (dados.inicio as Date | null) : check.demanda.inicio;
  const prazoFinal = 'prazo' in dados ? (dados.prazo as Date) : check.demanda.prazo;
  if (inicioFinal && inicioFinal > prazoFinal) {
    return NextResponse.json(
      { erro: 'A data de início não pode ser depois da data de entrega.' },
      { status: 400 },
    );
  }

  // Troca de data de entrega: travada para o analista no dia do prazo e
  // registrada sempre, para o admin enxergar quem vive adiando.
  const hoje = paraDiaISO();
  const prazoAnterior = check.demanda.prazo.toISOString().slice(0, 10);
  const prazoNovo = 'prazo' in dados ? (dados.prazo as Date).toISOString().slice(0, 10) : prazoAnterior;
  const trocouPrazo = prazoNovo !== prazoAnterior;
  if (trocouPrazo && prazoTravado(prazoAnterior, hoje, check.sessao.perfil)) {
    return NextResponse.json(
      {
        erro: prazoAnterior === hoje
          ? 'A demanda vence hoje: a data de entrega não pode mais ser alterada. Fale com um admin da equipe.'
          : 'O prazo desta demanda já venceu: a data de entrega não pode mais ser alterada. Fale com um admin da equipe.',
      },
      { status: 403 },
    );
  }
  // Adiamento de analista soma no contador que o admin vê no cartão.
  if (trocouPrazo && check.sessao.perfil !== 'ADMIN' && prazoNovo > prazoAnterior) {
    dados.reagendamentos = { increment: 1 };
  }

  if (novoAutorId) dados.autorId = novoAutorId;
  const autorFinal = novoAutorId ?? check.demanda.autorId;

  const demanda = await prisma.$transaction(async (tx) => {
    // O responsável nunca é colaborador da própria demanda. Trocar o
    // responsável tira o antigo da demanda: se ele deve continuar, o admin o
    // adiciona como colaborador.
    if (novosColaboradores !== null) {
      await tx.colaborador.deleteMany({ where: { demandaId: id } });
      const lista = novosColaboradores.filter((u) => u !== autorFinal);
      if (lista.length > 0) {
        await tx.colaborador.createMany({ data: lista.map((usuarioId) => ({ demandaId: id, usuarioId })) });
      }
    } else if (novoAutorId) {
      await tx.colaborador.deleteMany({ where: { demandaId: id, usuarioId: novoAutorId } });
    }
    if (trocouPrazo) {
      await tx.reagendamento.create({
        data: {
          demandaId: id,
          prazoAnterior: check.demanda.prazo,
          prazoNovo: dados.prazo as Date,
          diasAntes: diasEntre(hoje, prazoAnterior),
          usuarioId: check.sessao.sub,
          usuarioNome: check.sessao.nome,
          perfil: check.sessao.perfil,
          personificadoPor: check.sessao.personificadoPor?.nome ?? null,
        },
      });
    }
    return tx.demanda.update({
      where: { id },
      data: dados,
      include: {
        autor: { select: { id: true, nome: true, email: true, equipe: true } },
        recorrencia: { select: { id: true, frequencia: true, intervalo: true, diaDoMes: true, diasSemana: true, apenasDiasUteis: true, inicio: true, ativa: true } },
        colaboradores: SELECAO_COLABORADORES,
      },
    });
  });
  await registrarAtividade(check.sessao.sub);
  return NextResponse.json(demanda);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const check = await permitido(id, 'excluir');
  if ('erro' in check) return NextResponse.json({ erro: check.erro }, { status: check.codigo });

  await prisma.demanda.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

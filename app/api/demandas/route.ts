import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessaoAtual } from '@/lib/auth';
import { diaParaDate, paraDiaISO } from '@/lib/datas';
import { ehOrigem, ehPrioridade, ehStatus } from '@/lib/dominio';
import { registrarAtividade } from '@/lib/registrar-atividade';

export const dynamic = 'force-dynamic';

/**
 * Lista demandas. Analista vê só as próprias; admin vê as de todos e pode
 * filtrar por autor com ?autorId=. O recorte por mês (?de=&ate=) alimenta o
 * calendário sem trazer o histórico inteiro.
 */
export async function GET(req: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const de = searchParams.get('de');
  const ate = searchParams.get('ate');
  const autorFiltro = searchParams.get('autorId');

  // O escopo é a regra de segurança: analista nunca escapa do próprio id.
  const autorId =
    sessao.perfil === 'ADMIN'
      ? autorFiltro && autorFiltro !== 'TODOS'
        ? autorFiltro
        : undefined
      : sessao.sub;

  const demandas = await prisma.demanda.findMany({
    where: {
      ...(autorId ? { autorId } : {}),
      ...(de && ate
        ? { prazo: { gte: diaParaDate(de), lte: diaParaDate(ate) } }
        : {}),
    },
    include: {
      autor: { select: { id: true, nome: true, email: true, equipe: true } },
      recorrencia: { select: { id: true, frequencia: true, intervalo: true, diaDoMes: true, diasSemana: true, apenasDiasUteis: true, inicio: true, ativa: true } },
    },
    orderBy: [{ prazo: 'asc' }, { criadoEm: 'asc' }],
  });

  return NextResponse.json(demandas);
}

export async function POST(req: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });

  const corpo = await req.json().catch(() => null);
  if (!corpo) return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 });

  const titulo = String(corpo.titulo ?? '').trim();
  if (!titulo) return NextResponse.json({ erro: 'Informe o título da demanda.' }, { status: 400 });

  const prazo = String(corpo.prazo ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(prazo)) {
    return NextResponse.json({ erro: 'Informe um prazo válido.' }, { status: 400 });
  }

  // Início é opcional; quando vem, não pode ser depois da entrega.
  const inicio = String(corpo.inicio ?? '').trim();
  if (inicio && !/^\d{4}-\d{2}-\d{2}$/.test(inicio)) {
    return NextResponse.json({ erro: 'Informe uma data de início válida.' }, { status: 400 });
  }
  if (inicio && inicio > prazo) {
    return NextResponse.json(
      { erro: 'A data de início não pode ser depois da data de entrega.' },
      { status: 400 },
    );
  }

  // Um admin pode lançar em nome de outro analista; o analista, só para si.
  const autorId =
    sessao.perfil === 'ADMIN' && typeof corpo.autorId === 'string' && corpo.autorId
      ? corpo.autorId
      : sessao.sub;

  const demanda = await prisma.demanda.create({
    data: {
      titulo,
      descricao: String(corpo.descricao ?? '').trim() || null,
      solicitante: String(corpo.solicitante ?? '').trim() || null,
      categoria: String(corpo.categoria ?? '').trim() || null,
      prioridade: ehPrioridade(corpo.prioridade) ? corpo.prioridade : 'MEDIA',
      status: ehStatus(corpo.status) ? corpo.status : 'ABERTA',
      origem: ehOrigem(corpo.origem) ? corpo.origem : 'MANUAL',
      inicio: inicio ? diaParaDate(inicio) : null,
      prazo: diaParaDate(prazo),
      autorId,
    },
    include: {
      autor: { select: { id: true, nome: true, email: true, equipe: true } },
      recorrencia: { select: { id: true, frequencia: true, intervalo: true, diaDoMes: true, diasSemana: true, apenasDiasUteis: true, inicio: true, ativa: true } },
    },
  });

  await registrarAtividade(sessao.sub);
  return NextResponse.json(demanda, { status: 201 });
}

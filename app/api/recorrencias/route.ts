import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessaoAtual } from '@/lib/auth';
import { diaParaDate } from '@/lib/datas';
import { ehPrioridade } from '@/lib/dominio';
import { ehFrequencia, proximasDatas, validarRegra, type Regra } from '@/lib/recorrencia';
import { MAXIMO_POR_DEMANDA } from '@/lib/anexos';
import { confirmarAnexos, type AnexoConfirmado } from '@/lib/anexos-servidor';
import { registrarAtividade } from '@/lib/registrar-atividade';

export const dynamic = 'force-dynamic';

/** Monta a regra a partir do corpo cru, normalizando o que veio da tela. */
function lerRegra(corpo: Record<string, unknown>): Regra {
  const diasSemana = Array.isArray(corpo.diasSemana)
    ? corpo.diasSemana.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    : [];
  const diaDoMes = corpo.diaDoMes === null || corpo.diaDoMes === undefined || corpo.diaDoMes === ''
    ? null
    : Number(corpo.diaDoMes);

  return {
    frequencia: ehFrequencia(corpo.frequencia) ? corpo.frequencia : 'MENSAL',
    intervalo: Number(corpo.intervalo ?? 1) || 1,
    diasSemana,
    diaDoMes: Number.isFinite(diaDoMes) ? (diaDoMes as number) : null,
    apenasDiasUteis: corpo.apenasDiasUteis === true,
    inicio: String(corpo.inicio ?? '').slice(0, 10),
    fim: corpo.fim ? String(corpo.fim).slice(0, 10) : null,
    maximo: corpo.maximo ? Number(corpo.maximo) : null,
  };
}

/** Analista vê as próprias regras; admin vê as de todos. */
export async function GET() {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });

  const recorrencias = await prisma.recorrencia.findMany({
    where: sessao.perfil === 'ADMIN' ? {} : { autorId: sessao.sub },
    include: {
      autor: { select: { id: true, nome: true, email: true, equipe: true } },
      _count: { select: { demandas: true } },
    },
    orderBy: [{ ativa: 'desc' }, { criadoEm: 'desc' }],
  });
  return NextResponse.json(recorrencias);
}

export async function POST(req: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });

  const corpo = await req.json().catch(() => null);
  if (!corpo) return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 });

  const titulo = String(corpo.titulo ?? '').trim();
  if (!titulo) return NextResponse.json({ erro: 'Informe o título da demanda.' }, { status: 400 });

  const regra = lerRegra(corpo);
  const check = validarRegra(regra);
  if (!check.ok) return NextResponse.json({ erro: check.erro }, { status: 400 });

  // Um admin pode lançar em nome de outro analista; o analista, só para si.
  const autorId =
    sessao.perfil === 'ADMIN' && typeof corpo.autorId === 'string' && corpo.autorId
      ? corpo.autorId
      : sessao.sub;

  // Anexos do molde, já no R2: cada demanda gerada aponta para os mesmos arquivos.
  let anexosMolde: AnexoConfirmado[] = [];
  if (Array.isArray(corpo.anexos) && corpo.anexos.length > 0) {
    if (corpo.anexos.length > MAXIMO_POR_DEMANDA) {
      return NextResponse.json(
        { erro: `Cada demanda aceita no máximo ${MAXIMO_POR_DEMANDA} anexos.` },
        { status: 400 },
      );
    }
    const confirmados = await confirmarAnexos(corpo.anexos, sessao.sub);
    if (!confirmados.ok) return NextResponse.json({ erro: confirmados.erro }, { status: 400 });
    anexosMolde = confirmados.valor;
  }

  const recorrencia = await prisma.recorrencia.create({
    data: {
      titulo,
      descricao: String(corpo.descricao ?? '').trim() || null,
      solicitante: String(corpo.solicitante ?? '').trim() || null,
      categoria: String(corpo.categoria ?? '').trim() || null,
      prioridade: ehPrioridade(corpo.prioridade) ? corpo.prioridade : 'MEDIA',
      frequencia: regra.frequencia,
      intervalo: regra.intervalo,
      diasSemana: regra.diasSemana,
      diaDoMes: regra.diaDoMes,
      apenasDiasUteis: regra.apenasDiasUteis,
      inicio: diaParaDate(regra.inicio),
      fim: regra.fim ? diaParaDate(regra.fim) : null,
      maximo: regra.maximo,
      autorId,
    },
    include: { autor: { select: { id: true, nome: true, email: true, equipe: true } } },
  });

  if (anexosMolde.length > 0) {
    await prisma.anexoRecorrencia.createMany({
      data: anexosMolde.map((a) => ({ recorrenciaId: recorrencia.id, ...a })),
    });
  }

  /*
   * A primeira ocorrência nasce junto, se já estiver vencida ou for hoje —
   * assim quem cria uma recorrência que começa hoje vê a demanda na hora, em
   * vez de esperar o cron do dia seguinte. As futuras ficam para o cron.
   */
  const hoje = new Date().toISOString().slice(0, 10);
  const primeira = proximasDatas(regra, 1)[0];
  if (primeira && primeira <= hoje) {
    const demanda = await prisma.demanda.create({
      data: {
        titulo: recorrencia.titulo,
        descricao: recorrencia.descricao,
        solicitante: recorrencia.solicitante,
        categoria: recorrencia.categoria,
        prioridade: recorrencia.prioridade,
        prazo: diaParaDate(primeira),
        autorId: recorrencia.autorId,
        recorrenciaId: recorrencia.id,
      },
    });
    if (anexosMolde.length > 0) {
      await prisma.anexo.createMany({
        data: anexosMolde.map((a) => ({
          demandaId: demanda.id,
          ...a,
          autorId: recorrencia.autorId,
          autorNome: recorrencia.autor.nome,
        })),
      });
    }
    await prisma.recorrencia.update({
      where: { id: recorrencia.id },
      data: { ultimaGeracao: diaParaDate(primeira), geradas: { increment: 1 } },
    });
  }

  await registrarAtividade(sessao.sub);
  return NextResponse.json(recorrencia, { status: 201 });
}

/**
 * Monta o perfil gamificado de uma pessoa a partir dos dados reais.
 *
 * Nada aqui é estimado: ofensiva vem dos dias ativos, conquistas e missões
 * saem de contagens de demandas. O que o banco guarda é só o acumulado que
 * não daria para recalcular (XP) e o que já foi desbloqueado.
 */
import { prisma } from '@/lib/prisma';
import { paraDiaISO, somarDias, diaParaDate } from '@/lib/datas';
import { apurarOfensiva, type Ofensiva } from '@/lib/ofensiva';
import {
  MISSOES, apurarConquistas, apurarMissoes, conquistasAGravar, nivelDoXp,
  progressoDasMissoes, type ConquistaApurada, type MissaoApurada,
  type NumerosDoUsuario, type Nivel,
} from '@/lib/gamificacao';

/**
 * Quanto histórico de dias ativos buscar. Precisa cobrir o mapa de calor
 * inteiro, senão o início do período apareceria vazio por falta de leitura —
 * a ofensiva em si se resolveria com bem menos.
 */
const JANELA_DIAS = 190;

/** Dias no mapa de calor: seis meses. */
const DIAS_EVOLUCAO = 182;

export type EvolucaoDia = { dia: string; ativo: boolean };

export type PerfilGamificado = {
  xp: number;
  nivel: Nivel;
  ofensiva: Ofensiva;
  numeros: NumerosDoUsuario;
  conquistas: ConquistaApurada[];
  missoes: MissaoApurada[];
  /** Dias ativos dos últimos 6 meses, para o mapa de calor. */
  evolucao: EvolucaoDia[];
  /** Números do rodapé da Minha evolução. */
  resumo: {
    diasAtivos: number;
    concluidas: number;
    taxaConclusao: number;
    semanasSeguidas: number;
  };
};

/** Segunda-feira da semana de hoje, em ISO. */
function inicioDaSemana(hoje: string): string {
  const d = diaParaDate(hoje);
  // getUTCDay: 0 = domingo. Segunda é o início da semana de trabalho.
  const desde = (d.getUTCDay() + 6) % 7;
  return somarDias(hoje, -desde);
}

/**
 * Quantas semanas seguidas, contando de trás para frente, tiveram ao menos
 * um dia ativo. Para de contar na primeira semana vazia.
 */
function semanasSeguidas(dias: Set<string>, hoje: string): number {
  let semanas = 0;
  let inicio = inicioDaSemana(hoje);

  // Limite de 52 semanas: o suficiente para o cartão e evita laço infinito.
  for (let i = 0; i < 52; i += 1) {
    const temAtividade = Array.from({ length: 7 }, (_, k) => somarDias(inicio, k))
      .some((d) => dias.has(d));
    if (!temAtividade) break;
    semanas += 1;
    inicio = somarDias(inicio, -7);
  }
  return semanas;
}

/**
 * Quantas das funcionalidades do produto a pessoa já tocou.
 *
 * É uma aproximação honesta por rastros no banco — não temos telemetria de
 * navegação. Cada sinal abaixo prova que a pessoa usou aquela parte.
 */
async function funcionalidadesUsadas(usuarioId: string): Promise<number> {
  const [demandas, comentarios, anexos, recorrencias, diasAtivos, concluidas] =
    await Promise.all([
      prisma.demanda.count({ where: { autorId: usuarioId } }),
      prisma.comentario.count({ where: { autorId: usuarioId } }),
      prisma.anexo.count({ where: { autorId: usuarioId } }),
      prisma.recorrencia.count({ where: { autorId: usuarioId } }),
      prisma.diaAtivo.count({ where: { usuarioId } }),
      prisma.demanda.count({ where: { autorId: usuarioId, status: 'CONCLUIDA' } }),
    ]);

  return [demandas, comentarios, anexos, recorrencias, diasAtivos, concluidas]
    .filter((n) => n > 0).length;
}

/**
 * Lê tudo que o perfil precisa e grava o que mudou (conquistas recém-batidas,
 * progresso das missões e o XP que elas pagam).
 */
export async function carregarPerfil(usuarioId: string): Promise<PerfilGamificado> {
  const hoje = paraDiaISO();

  const [registros, concluidas, totalDemandas, colaboracoes, gravadas, missoesGravadas, progresso] =
    await Promise.all([
      prisma.diaAtivo.findMany({
        where: { usuarioId, dia: { gte: diaParaDate(somarDias(hoje, -JANELA_DIAS)) } },
        select: { dia: true },
        orderBy: { dia: 'asc' },
      }),
      prisma.demanda.count({ where: { autorId: usuarioId, status: 'CONCLUIDA' } }),
      prisma.demanda.count({ where: { autorId: usuarioId } }),
      // Colaboração = demanda em que a pessoa comentou ou anexou algo.
      prisma.demanda.count({
        where: {
          OR: [
            { comentarios: { some: { autorId: usuarioId } } },
            { anexos: { some: { autorId: usuarioId } } },
          ],
        },
      }),
      prisma.conquista.findMany({ where: { usuarioId }, select: { chave: true, emQue: true } }),
      prisma.missao.findMany({
        where: { usuarioId },
        select: { chave: true, progresso: true, concluidaEm: true, xpCreditado: true },
      }),
      prisma.progresso.findUnique({ where: { usuarioId }, select: { xp: true } }),
    ]);

  const dias = registros.map((r) => r.dia.toISOString().slice(0, 10));
  const ofensiva = apurarOfensiva(dias, hoje);

  const numeros: NumerosDoUsuario = {
    ofensiva: ofensiva.atual,
    recordeOfensiva: Math.max(ofensiva.atual, ofensiva.recorde),
    concluidas,
    colaboracoes,
  };

  /* Conquistas recém-batidas viram linha no banco, para a data de desbloqueio
     ficar registrada — sem isso, "conquistada em 12/08" seria perdido. */
  const novas = conquistasAGravar(numeros, gravadas.map((c) => c.chave));
  if (novas.length > 0) {
    await prisma.conquista.createMany({
      data: novas.map((chave) => ({ usuarioId, chave })),
      skipDuplicates: true,
    });
    gravadas.push(...novas.map((chave) => ({ chave, emQue: new Date() })));
  }

  /* Missões: recalcula o progresso e credita o XP de quem fechou agora. */
  const desde = diaParaDate(inicioDaSemana(hoje));
  const concluidasNaSemana = await prisma.demanda.count({
    where: { autorId: usuarioId, status: 'CONCLUIDA', atualizadoEm: { gte: desde } },
  });
  const avanco = progressoDasMissoes(
    numeros, concluidasNaSemana, await funcionalidadesUsadas(usuarioId),
  );

  let xpGanho = 0;
  for (const def of MISSOES) {
    const atual = avanco[def.chave] ?? 0;
    const linha = missoesGravadas.find((m) => m.chave === def.chave);
    const fechou = atual >= def.meta;
    // Paga o XP uma única vez, na primeira vez que a missão fecha.
    const creditar = fechou && !linha?.xpCreditado;
    if (creditar) xpGanho += def.xp;

    if (!linha || linha.progresso !== atual || creditar) {
      await prisma.missao.upsert({
        where: { usuarioId_chave: { usuarioId, chave: def.chave } },
        create: {
          usuarioId, chave: def.chave, progresso: atual,
          concluidaEm: fechou ? new Date() : null, xpCreditado: creditar,
        },
        update: {
          progresso: atual,
          concluidaEm: fechou ? (linha?.concluidaEm ?? new Date()) : null,
          xpCreditado: creditar || (linha?.xpCreditado ?? false),
        },
      });
    }
  }

  /* XP: o das missões é acumulado; o das conquistas paga 25 por marco. */
  xpGanho += novas.length * 25;
  const xpAtual = (progresso?.xp ?? 0) + xpGanho;
  if (xpGanho > 0 || !progresso) {
    await prisma.progresso.upsert({
      where: { usuarioId },
      create: { usuarioId, xp: xpAtual },
      update: { xp: xpAtual },
    });
  }

  // Releitura após os upserts, para a tela mostrar o estado já gravado.
  const missoesFinais = await prisma.missao.findMany({
    where: { usuarioId },
    select: { chave: true, progresso: true, concluidaEm: true },
  });

  const conjunto = new Set(dias);
  const evolucao: EvolucaoDia[] = Array.from({ length: DIAS_EVOLUCAO }, (_, i) => {
    const dia = somarDias(hoje, -(DIAS_EVOLUCAO - 1 - i));
    return { dia, ativo: conjunto.has(dia) };
  });

  return {
    xp: xpAtual,
    nivel: nivelDoXp(xpAtual),
    ofensiva,
    numeros,
    conquistas: apurarConquistas(numeros, gravadas),
    missoes: apurarMissoes(missoesFinais),
    evolucao,
    resumo: {
      diasAtivos: ofensiva.totalDias,
      concluidas,
      taxaConclusao: totalDemandas > 0 ? Math.round((concluidas / totalDemandas) * 100) : 0,
      semanasSeguidas: semanasSeguidas(conjunto, hoje),
    },
  };
}

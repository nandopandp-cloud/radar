import { prisma } from '@/lib/prisma';
import { diaParaDate, paraDiaISO, proximoDiaUtil } from '@/lib/datas';
import { PESO_PRIORIDADE, STATUS_PENDENTES, type Prioridade } from '@/lib/dominio';

export type DemandaPostergada = {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  status: string;
  origem: string;
  solicitante: string | null;
  /** Dia para o qual a demanda estava originalmente prevista (antes de postergar). */
  diaOriginal: string;
  vezesAdiada: number;
  diasAtraso: number;
};

export type GrupoColaborador = {
  colaboradorId: string;
  nome: string;
  email: string;
  equipe: string | null;
  demandas: DemandaPostergada[];
};

/**
 * Busca as demandas ainda pendentes cuja data prevista já passou em relação ao
 * dia de referência — ou seja, aquelas que "viraram" demanda do dia seguinte.
 */
export async function buscarPostergadas(diaReferencia: string): Promise<GrupoColaborador[]> {
  const limite = diaParaDate(diaReferencia);

  const demandas = await prisma.demanda.findMany({
    where: {
      status: { in: STATUS_PENDENTES },
      dataPrevista: { lt: limite },
    },
    include: { colaborador: true },
    orderBy: { dataPrevista: 'asc' },
  });

  const porColaborador = new Map<string, GrupoColaborador>();

  for (const d of demandas) {
    if (!d.colaborador.ativo) continue;

    const diaOriginal = d.dataPrevista.toISOString().slice(0, 10);
    const diasAtraso = Math.round(
      (limite.getTime() - d.dataPrevista.getTime()) / 86_400_000,
    );

    const grupo = porColaborador.get(d.colaboradorId) ?? {
      colaboradorId: d.colaboradorId,
      nome: d.colaborador.nome,
      email: d.colaborador.email,
      equipe: d.colaborador.equipe,
      demandas: [],
    };

    grupo.demandas.push({
      id: d.id,
      titulo: d.titulo,
      descricao: d.descricao,
      prioridade: d.prioridade,
      status: d.status,
      origem: d.origem,
      solicitante: d.solicitante,
      diaOriginal,
      vezesAdiada: d.vezesAdiada,
      diasAtraso,
    });

    porColaborador.set(d.colaboradorId, grupo);
  }

  // Dentro de cada colaborador: prioridade mais alta primeiro, depois mais atrasada.
  for (const grupo of porColaborador.values()) {
    grupo.demandas.sort((a, b) => {
      const pa = PESO_PRIORIDADE[a.prioridade as Prioridade] ?? 9;
      const pb = PESO_PRIORIDADE[b.prioridade as Prioridade] ?? 9;
      if (pa !== pb) return pa - pb;
      return b.diasAtraso - a.diasAtraso;
    });
  }

  return [...porColaborador.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/**
 * Empurra efetivamente as demandas pendentes atrasadas para o dia de referência,
 * incrementando o contador de adiamentos. Retorna quantas foram movidas.
 */
export async function aplicarPostergacao(diaReferencia: string): Promise<number> {
  const limite = diaParaDate(diaReferencia);

  const pendentes = await prisma.demanda.findMany({
    where: { status: { in: STATUS_PENDENTES }, dataPrevista: { lt: limite } },
    select: { id: true },
  });

  if (pendentes.length === 0) return 0;

  await prisma.$transaction(
    pendentes.map((d) =>
      prisma.demanda.update({
        where: { id: d.id },
        data: { dataPrevista: limite, vezesAdiada: { increment: 1 } },
      }),
    ),
  );

  return pendentes.length;
}

/** Dia de referência padrão para um disparo: o próximo dia útil após hoje. */
export function diaReferenciaPadrao(): string {
  return proximoDiaUtil(paraDiaISO());
}

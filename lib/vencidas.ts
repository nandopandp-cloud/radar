import { prisma } from '@/lib/prisma';
import { diaParaDate, paraDiaISO } from '@/lib/datas';
import { PESO_PRIORIDADE, STATUS_PENDENTES, type Prioridade } from '@/lib/dominio';

export type DemandaVencida = {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  status: string;
  categoria: string | null;
  /// Prazo de entrega que já venceu.
  prazo: string;
  diasVencido: number;
  vezesAlertada: number;
};

export type GrupoAutor = {
  usuarioId: string;
  nome: string;
  email: string;
  equipe: string | null;
  demandas: DemandaVencida[];
};

/**
 * Demandas cujo prazo já venceu e que continuam pendentes, agrupadas por autor.
 *
 * A regra do produto: o prazo é o último dia válido para entregar. Uma demanda
 * com prazo em 10 só é cobrada a partir do dia 11.
 */
export async function buscarVencidas(diaReferencia: string): Promise<GrupoAutor[]> {
  const limite = diaParaDate(diaReferencia);

  const demandas = await prisma.demanda.findMany({
    where: {
      status: { in: STATUS_PENDENTES },
      prazo: { lt: limite },
    },
    include: { autor: true },
    orderBy: { prazo: 'asc' },
  });

  const porAutor = new Map<string, GrupoAutor>();

  for (const d of demandas) {
    if (!d.autor.ativo) continue;

    const prazo = d.prazo.toISOString().slice(0, 10);
    const diasVencido = Math.round((limite.getTime() - d.prazo.getTime()) / 86_400_000);

    const grupo = porAutor.get(d.autorId) ?? {
      usuarioId: d.autorId,
      nome: d.autor.nome,
      email: d.autor.email,
      equipe: d.autor.equipe,
      demandas: [],
    };

    grupo.demandas.push({
      id: d.id,
      titulo: d.titulo,
      descricao: d.descricao,
      prioridade: d.prioridade,
      status: d.status,
      categoria: d.categoria,
      prazo,
      diasVencido,
      vezesAlertada: d.vezesAlertada,
    });

    porAutor.set(d.autorId, grupo);
  }

  // Mais grave primeiro: prioridade alta, depois vencida há mais tempo.
  for (const grupo of porAutor.values()) {
    grupo.demandas.sort((a, b) => {
      const pa = PESO_PRIORIDADE[a.prioridade as Prioridade] ?? 9;
      const pb = PESO_PRIORIDADE[b.prioridade as Prioridade] ?? 9;
      if (pa !== pb) return pa - pb;
      return b.diasVencido - a.diasVencido;
    });
  }

  return [...porAutor.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Marca as demandas como alertadas, para o e-mail poder dizer "3º aviso". */
export async function registrarAlerta(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const r = await prisma.demanda.updateMany({
    where: { id: { in: ids } },
    data: { vezesAlertada: { increment: 1 } },
  });
  return r.count;
}

/** O alerta de hoje cobra tudo que venceu até ontem. */
export function diaReferenciaPadrao(): string {
  return paraDiaISO();
}

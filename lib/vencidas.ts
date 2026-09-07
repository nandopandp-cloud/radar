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
  /// Prazo de entrega: já vencido ou vencendo hoje, conforme `atrasada`.
  prazo: string;
  /// true = já passou do prazo; false = o prazo é hoje (ainda dentro do dia).
  atrasada: boolean;
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
 * Demandas pendentes que já venceram ou vencem hoje, agrupadas por autor —
 * é o resumo diário enviado por e-mail.
 *
 * Regra do produto: o prazo é o último dia válido para entregar. Uma demanda
 * com prazo em 10 aparece como "vence hoje" no dia 10 e como "atrasada" a
 * partir do dia 11. Só demandas atrasadas contam para `vezesAlertada` — o
 * lembrete do próprio dia do prazo não é considerado uma cobrança.
 */
export async function buscarVencidas(diaReferencia: string): Promise<GrupoAutor[]> {
  const limite = diaParaDate(diaReferencia);
  const amanha = diaParaDate(diaReferencia);
  amanha.setUTCDate(amanha.getUTCDate() + 1);

  const demandas = await prisma.demanda.findMany({
    where: {
      status: { in: STATUS_PENDENTES },
      prazo: { lt: amanha },
    },
    include: { autor: true },
    orderBy: { prazo: 'asc' },
  });

  const porAutor = new Map<string, GrupoAutor>();

  for (const d of demandas) {
    if (!d.autor.ativo) continue;

    const prazo = d.prazo.toISOString().slice(0, 10);
    const atrasada = d.prazo.getTime() < limite.getTime();
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
      atrasada,
      diasVencido,
      vezesAlertada: d.vezesAlertada,
    });

    porAutor.set(d.autorId, grupo);
  }

  // Mais grave primeiro: atrasada antes de hoje, depois prioridade, depois mais antiga.
  for (const grupo of porAutor.values()) {
    grupo.demandas.sort((a, b) => {
      if (a.atrasada !== b.atrasada) return a.atrasada ? -1 : 1;
      const pa = PESO_PRIORIDADE[a.prioridade as Prioridade] ?? 9;
      const pb = PESO_PRIORIDADE[b.prioridade as Prioridade] ?? 9;
      if (pa !== pb) return pa - pb;
      return b.diasVencido - a.diasVencido;
    });
  }

  return [...porAutor.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/**
 * Marca como alertadas as demandas já atrasadas (exclui as que só vencem
 * hoje — o lembrete do dia do prazo não conta como cobrança).
 */
export async function registrarAlerta(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const r = await prisma.demanda.updateMany({
    where: { id: { in: ids } },
    data: { vezesAlertada: { increment: 1 } },
  });
  return r.count;
}

/** O alerta de hoje cobre o que venceu até ontem e o que vence hoje. */
export function diaReferenciaPadrao(): string {
  return paraDiaISO();
}

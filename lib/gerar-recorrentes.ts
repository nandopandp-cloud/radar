import { prisma } from '@/lib/prisma';
import { diaParaDate, paraDiaISO } from '@/lib/datas';
import { proximasDatas, type Frequencia, type Regra } from '@/lib/recorrencia';

/** Quantas ocorrências atrasadas uma regra pode recuperar numa única execução. */
const MAXIMO_POR_EXECUCAO = 20;

export type ResultadoGeracao = {
  regrasVistas: number;
  demandasCriadas: number;
  regrasEncerradas: number;
};

/**
 * Materializa as demandas recorrentes vencidas até `ate` (hoje, por padrão).
 *
 * Roda no cron diário. É idempotente: `ultimaGeracao` marca até onde a regra já
 * foi materializada, então rodar duas vezes no mesmo dia não duplica nada. Se o
 * cron ficar dias sem rodar, as ocorrências perdidas são recuperadas no limite
 * de MAXIMO_POR_EXECUCAO, para um feriado longo não gerar uma avalanche.
 */
export async function gerarRecorrentes(ate = paraDiaISO()): Promise<ResultadoGeracao> {
  const regras = await prisma.recorrencia.findMany({
    where: { ativa: true, inicio: { lte: diaParaDate(ate) } },
  });

  let demandasCriadas = 0;
  let regrasEncerradas = 0;

  for (const r of regras) {
    const regra: Regra = {
      frequencia: r.frequencia as Frequencia,
      intervalo: r.intervalo,
      diasSemana: r.diasSemana,
      diaDoMes: r.diaDoMes,
      apenasDiasUteis: r.apenasDiasUteis,
      inicio: r.inicio.toISOString().slice(0, 10),
      fim: r.fim ? r.fim.toISOString().slice(0, 10) : null,
      maximo: r.maximo,
    };

    // Retoma do dia seguinte à última geração; na primeira vez, do início.
    const desde = r.ultimaGeracao
      ? new Date(r.ultimaGeracao.getTime() + 86_400_000).toISOString().slice(0, 10)
      : regra.inicio;

    const pendentes = proximasDatas(regra, MAXIMO_POR_EXECUCAO, desde)
      .filter((d) => d <= ate);

    // Respeita o teto de ocorrências da regra.
    const restantes = r.maximo === null ? pendentes.length : Math.max(0, r.maximo - r.geradas);
    const aCriar = pendentes.slice(0, restantes);

    for (const dia of aCriar) {
      await prisma.demanda.create({
        data: {
          titulo: r.titulo,
          descricao: r.descricao,
          solicitante: r.solicitante,
          categoria: r.categoria,
          prioridade: r.prioridade,
          prazo: diaParaDate(dia),
          autorId: r.autorId,
          recorrenciaId: r.id,
        },
      });
      demandasCriadas += 1;
    }

    const geradas = r.geradas + aCriar.length;
    const ultima = aCriar.length > 0 ? diaParaDate(aCriar[aCriar.length - 1]) : r.ultimaGeracao;

    /*
     * A regra se encerra sozinha quando bate o teto ou quando não há mais data
     * pela frente — assim o cron para de visitá-la todo dia.
     */
    const bateuTeto = r.maximo !== null && geradas >= r.maximo;
    const proxima = proximasDatas(
      regra,
      1,
      ultima ? new Date(ultima.getTime() + 86_400_000).toISOString().slice(0, 10) : regra.inicio,
    )[0];
    const acabou = bateuTeto || !proxima;

    if (aCriar.length > 0 || acabou) {
      await prisma.recorrencia.update({
        where: { id: r.id },
        data: { geradas, ultimaGeracao: ultima, ...(acabou ? { ativa: false } : {}) },
      });
      if (acabou) regrasEncerradas += 1;
    }
  }

  return { regrasVistas: regras.length, demandasCriadas, regrasEncerradas };
}

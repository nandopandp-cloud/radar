import { proximasDatas, type Frequencia, type Regra } from '@/lib/recorrencia';
import { somarDias } from '@/lib/datas';

/** Uma regra como /api/recorrencias a devolve. */
export type RecorrenciaLista = {
  id: string;
  titulo: string;
  prioridade: string;
  frequencia: string;
  intervalo: number;
  diasSemana: number[];
  diaDoMes: number | null;
  apenasDiasUteis: boolean;
  inicio: string;
  fim: string | null;
  maximo: number | null;
  geradas: number;
  ultimaGeracao: string | null;
  ativa: boolean;
  autorId: string;
  autor: { id: string; nome: string };
};

/**
 * Ocorrência futura de uma recorrência: ainda não é demanda. O cron a cria no
 * próprio dia (ver lib/gerar-recorrentes.ts); até lá ela só aparece no
 * calendário, sem contar nos totais nem nos alertas.
 */
export type Prevista = {
  id: string;
  recorrenciaId: string;
  titulo: string;
  prioridade: string;
  dia: string;
  autorId: string;
  autorNome: string;
};

/**
 * Datas que a regra ainda vai gerar, de hoje em diante. Parte do dia seguinte
 * à última geração — o que já virou demanda não aparece duas vezes — e
 * respeita o teto de ocorrências. Regra parada ou excluída não prevê nada.
 */
export function calcularPrevistas(regras: RecorrenciaLista[], hoje: string): Prevista[] {
  const previstas: Prevista[] = [];
  for (const r of regras) {
    if (!r.ativa) continue;
    const restantes = r.maximo === null ? Infinity : r.maximo - r.geradas;
    if (restantes <= 0) continue;

    const regra: Regra = {
      frequencia: r.frequencia as Frequencia,
      intervalo: r.intervalo,
      diasSemana: r.diasSemana,
      diaDoMes: r.diaDoMes,
      apenasDiasUteis: r.apenasDiasUteis,
      inicio: r.inicio.slice(0, 10),
      fim: r.fim ? r.fim.slice(0, 10) : null,
      maximo: r.maximo,
    };
    const depoisDaUltima = r.ultimaGeracao ? somarDias(r.ultimaGeracao.slice(0, 10), 1) : regra.inicio;
    const desde = depoisDaUltima > hoje ? depoisDaUltima : hoje;

    // proximasDatas já limita a 500 datas: num ritmo diário, mais de um ano à frente.
    const datas = proximasDatas(regra, Math.min(restantes, 500), desde);
    for (const dia of datas) {
      previstas.push({
        id: `${r.id}:${dia}`,
        recorrenciaId: r.id,
        titulo: r.titulo,
        prioridade: r.prioridade,
        dia,
        autorId: r.autorId,
        autorNome: r.autor.nome,
      });
    }
  }
  return previstas;
}

import { somarDias } from '@/lib/datas';

/**
 * Feriados nacionais do Brasil (Lei 662/1949 e alterações). Carnaval e Corpus
 * Christi são ponto facultativo, não feriado nacional, e por isso ficam fora.
 */
const FIXOS = [
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '11-20', // Dia Nacional de Zumbi e da Consciência Negra (nacional desde 2024)
  '12-25', // Natal
];

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher), em YYYY-MM-DD. */
function pascoa(ano: number): string {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

const porAno = new Map<number, Set<string>>();

function feriadosDoAno(ano: number): Set<string> {
  let conjunto = porAno.get(ano);
  if (!conjunto) {
    conjunto = new Set(FIXOS.map((md) => `${ano}-${md}`));
    // Novembro 20 só virou feriado nacional em 2024 (Lei 14.759/2023).
    if (ano < 2024) conjunto.delete(`${ano}-11-20`);
    conjunto.add(somarDias(pascoa(ano), -2)); // Sexta-feira Santa
    porAno.set(ano, conjunto);
  }
  return conjunto;
}

/** O dia (YYYY-MM-DD) é feriado nacional? */
export function ehFeriadoNacional(dia: string): boolean {
  return feriadosDoAno(Number(dia.slice(0, 4))).has(dia);
}

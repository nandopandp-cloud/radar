/**
 * Regras da data de entrega. Sem dependência de servidor: a API aplica a
 * trava e a gaveta usa as mesmas funções para desabilitar o campo.
 */

/**
 * Chegado o dia do prazo, o analista não mexe mais na data de entrega — a
 * demanda que não for concluída até o fim do dia vira atrasada no seguinte.
 * Vale também para prazo já vencido. Admin altera livremente.
 */
export function prazoTravado(prazo: string, hoje: string, perfil: string): boolean {
  return perfil !== 'ADMIN' && prazo <= hoje;
}

/** Dias corridos de `de` até `ate`, ambos "YYYY-MM-DD". */
export function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
}

/**
 * Adiamento feito com no máximo 1 dia de antecedência — o jeito de nunca ter
 * nada atrasado sem entregar, agora que o dia do prazo está travado.
 */
export function adiadoNaVespera(diasAntes: number): boolean {
  return diasAntes <= 1;
}

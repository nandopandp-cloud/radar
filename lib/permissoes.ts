import type { Demanda, SessaoUI } from '@/lib/tipos';

/**
 * Quem trabalha na demanda e pode editá-la: admin, o responsável e os
 * colaboradores. Espelha a regra do servidor em app/api/demandas/[id]/route.ts,
 * que é quem de fato decide — aqui só evita mostrar botões que dariam 403.
 */
export function podeEditarDemanda(d: Demanda, sessao: SessaoUI): boolean {
  return sessao.perfil === 'ADMIN' || participaDaDemanda(d, sessao.id);
}

/** Responsável ou colaborador — o que "meus itens" considera como seu. */
export function participaDaDemanda(d: Demanda, usuarioId: string): boolean {
  return d.autorId === usuarioId || (d.colaboradores ?? []).some((c) => c.usuario.id === usuarioId);
}

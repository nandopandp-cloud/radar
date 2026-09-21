/**
 * Peças compartilhadas pelos e-mails do Radar: paleta, escape e o link que
 * abre uma demanda. Vivem aqui, e não em `email-template.ts`, porque aquele
 * módulo é o alerta diário — amarrado a `GrupoAutor` — e o e-mail de
 * comentário precisa das mesmas cores sem carregar aquela estrutura junto.
 */

/** Base pública, para links e imagens do e-mail resolverem fora do app. */
export const BASE_URL = (
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://radar-mu-seven.vercel.app')
).replace(/\/$/, '');

export const MARCA = '#2563eb';
export const MARCA_ESCURA = '#1d4ed8';
export const TINTA = '#0f172a';
export const TINTA_SUAVE = '#64748b';
export const BORDA = '#e2e8f0';

export function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

/** Link direto para a demanda dentro do Radar. */
export function linkDemanda(id: string): string {
  return `${BASE_URL}/?demanda=${id}`;
}

/** Tipos aceitos para foto de perfil. */
export const TIPOS_AVATAR = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'] as const;

/** Lado máximo em pixels — a imagem é reduzida no navegador antes de subir. */
export const LADO_MAXIMO = 256;

/**
 * Teto do data URI já codificado. GIFs animados não passam pelo canvas do
 * navegador (perderiam a animação), então sobem no tamanho original e
 * precisam de uma folga maior que os ~40 KB de um PNG redimensionado.
 */
export const TAMANHO_MAXIMO = 400_000;

/**
 * Valida um data URI de avatar vindo do cliente.
 *
 * O valor é gravado no banco e depois renderizado em `<img src>`, então
 * precisa ser barrado aqui: sem isto, daria para injetar `data:text/html`
 * ou um SVG com script.
 */
export function validarAvatar(valor: unknown): { ok: true; valor: string } | { ok: false; erro: string } {
  if (typeof valor !== 'string' || !valor.trim()) {
    return { ok: false, erro: 'Imagem inválida.' };
  }

  const limpo = valor.trim();

  const cabecalho = /^data:([a-z/+.-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(limpo);
  if (!cabecalho) {
    return { ok: false, erro: 'Formato inválido — envie um arquivo de imagem.' };
  }

  const [, tipo, dados] = cabecalho;
  if (!(TIPOS_AVATAR as readonly string[]).includes(tipo.toLowerCase())) {
    return { ok: false, erro: 'Use uma imagem JPG, PNG ou GIF.' };
  }

  if (dados.length === 0) {
    return { ok: false, erro: 'Imagem vazia.' };
  }

  if (limpo.length > TAMANHO_MAXIMO) {
    return { ok: false, erro: 'Imagem muito grande. Envie um arquivo menor.' };
  }

  return { ok: true, valor: limpo };
}

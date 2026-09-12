/** Teto por arquivo, em bytes do conteúdo original (1MB). */
export const TAMANHO_MAXIMO = 1_048_576;

/** Quantos anexos uma demanda aceita, para o banco não crescer sem limite. */
export const MAXIMO_POR_DEMANDA = 20;

/**
 * Teto de conteúdo por requisição, em bytes já codificados. A Vercel corta o
 * corpo em 4,5MB e base64 infla cerca de 1/3, então mandar vários arquivos de
 * 1MB de uma vez estouraria: o cliente divide o envio em lotes abaixo disto.
 */
export const LOTE_MAXIMO = 3_000_000;

/**
 * Divide os anexos em lotes que cabem numa requisição. Um arquivo sozinho
 * sempre forma um lote, mesmo grande — o limite de 1MB por arquivo já garante
 * que ele cabe.
 */
export function dividirEmLotes<T extends { conteudo: string }>(anexos: T[]): T[][] {
  const lotes: T[][] = [];
  let atual: T[] = [];
  let soma = 0;

  for (const a of anexos) {
    const tamanho = a.conteudo.length;
    if (atual.length > 0 && soma + tamanho > LOTE_MAXIMO) {
      lotes.push(atual);
      atual = [];
      soma = 0;
    }
    atual.push(a);
    soma += tamanho;
  }
  if (atual.length > 0) lotes.push(atual);
  return lotes;
}

/**
 * Tipos que o navegador executaria se abertos na própria origem. Qualquer
 * formato é aceito como anexo, mas estes são servidos como download forçado e
 * com o tipo trocado por octet-stream — sem isso, um .html ou .svg anexado
 * viraria XSS no domínio do Radar.
 */
const TIPOS_PERIGOSOS = [
  'text/html', 'application/xhtml+xml', 'image/svg+xml',
  'application/xml', 'text/xml', 'application/javascript', 'text/javascript',
];

export function ehTipoPerigoso(tipo: string): boolean {
  return TIPOS_PERIGOSOS.includes(tipo.trim().toLowerCase());
}

/**
 * Nome de arquivo seguro para exibir e para o cabeçalho de download: tira
 * diretórios, caracteres de controle e aspas, que quebrariam o Content-Disposition.
 */
export function limparNome(nome: string): string {
  const base = nome.split(/[/\\]/).pop() ?? 'arquivo';
  // eslint-disable-next-line no-control-regex
  const limpo = base.replace(/[\u0000-\u001f\u007f"\\]/g, '_').trim();
  return (limpo || 'arquivo').slice(0, 200);
}

/** Tamanho real, em bytes, do conteúdo codificado em base64. */
export function tamanhoDeBase64(dados: string): number {
  const preenchimento = dados.endsWith('==') ? 2 : dados.endsWith('=') ? 1 : 0;
  return Math.floor((dados.length * 3) / 4) - preenchimento;
}

export type AnexoValido = { nome: string; tipo: string; tamanho: number; conteudo: string };

/**
 * Valida um anexo vindo do cliente. Aceita qualquer formato — a única barreira
 * é o tamanho —, mas exige data URI base64 bem formado: o conteúdo é devolvido
 * ao navegador depois, e um valor malformado aqui viraria problema lá.
 */
export function validarAnexo(
  entrada: unknown,
): { ok: true; valor: AnexoValido } | { ok: false; erro: string } {
  if (!entrada || typeof entrada !== 'object') {
    return { ok: false, erro: 'Anexo inválido.' };
  }
  const { nome, conteudo } = entrada as Record<string, unknown>;

  if (typeof nome !== 'string' || !nome.trim()) {
    return { ok: false, erro: 'Anexo sem nome de arquivo.' };
  }
  if (typeof conteudo !== 'string' || !conteudo.trim()) {
    return { ok: false, erro: 'Anexo vazio.' };
  }

  const cabecalho = /^data:([a-z0-9/+.-]*);base64,([A-Za-z0-9+/=]+)$/i.exec(conteudo.trim());
  if (!cabecalho) {
    return { ok: false, erro: 'Não foi possível ler este arquivo. Tente enviá-lo novamente.' };
  }

  const [, tipoBruto, dados] = cabecalho;
  const tamanho = tamanhoDeBase64(dados);

  if (tamanho === 0) return { ok: false, erro: 'Arquivo vazio.' };
  if (tamanho > TAMANHO_MAXIMO) {
    return { ok: false, erro: 'Cada arquivo pode ter no máximo 1MB.' };
  }

  return {
    ok: true,
    valor: {
      nome: limparNome(nome),
      // Sem tipo declarado (formatos que o SO não reconhece), trata como binário.
      tipo: (tipoBruto || 'application/octet-stream').toLowerCase().slice(0, 120),
      tamanho,
      conteudo: conteudo.trim(),
    },
  };
}

/** Tamanho legível para a lista: 980 B, 12,4 KB, 1 MB. */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

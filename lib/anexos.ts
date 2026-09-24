/** Teto por arquivo, em bytes (10MB). */
export const TAMANHO_MAXIMO = 10 * 1024 * 1024;
export const TAMANHO_MAXIMO_TEXTO = '10MB';

/** Quantos anexos uma demanda aceita. */
export const MAXIMO_POR_DEMANDA = 20;

/**
 * Tipos que o navegador executaria se abertos direto. Qualquer formato é
 * aceito como anexo, mas estes são servidos como download forçado e com o
 * tipo trocado por octet-stream.
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

/** Tipo declarado pelo navegador; sem tipo reconhecível, trata como binário. */
export function limparTipo(tipo: unknown): string {
  const t = typeof tipo === 'string' ? tipo.trim().toLowerCase() : '';
  return /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(t) ? t.slice(0, 120) : 'application/octet-stream';
}

/** Tamanho legível para a lista: 980 B, 12,4 KB, 1 MB. */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

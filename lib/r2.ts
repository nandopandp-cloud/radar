import { AwsClient } from 'aws4fetch';

/**
 * Acesso ao bucket de anexos no Cloudflare R2, pela API compatível com S3.
 * O bucket é privado: tudo que o navegador faz nele passa por um link assinado
 * gerado aqui, depois de o Radar conferir a permissão.
 */

type Conexao = { cliente: AwsClient; base: string };
let conexao: Conexao | null = null;

function conectar(): Conexao {
  if (conexao) return conexao;
  const conta = process.env.R2_ACCOUNT_ID?.trim();
  const chaveId = process.env.R2_ACCESS_KEY_ID?.trim();
  const segredo = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  if (!conta || !chaveId || !segredo || !bucket) {
    throw new Error(
      'R2 não configurado: defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET.',
    );
  }
  conexao = {
    cliente: new AwsClient({
      accessKeyId: chaveId,
      secretAccessKey: segredo,
      service: 's3',
      region: 'auto',
    }),
    base: `https://${conta}.r2.cloudflarestorage.com/${bucket}`,
  };
  return conexao;
}

function urlDe(chave: string): URL {
  const { base } = conectar();
  return new URL(`${base}/${chave.split('/').map(encodeURIComponent).join('/')}`);
}

/**
 * Link para o navegador subir o arquivo direto no R2, sem passar pela Vercel.
 * O content-length entra na assinatura: o R2 recusa um corpo de tamanho
 * diferente do declarado, então o teto conferido aqui vale lá também.
 */
export async function linkDeEnvio(chave: string, tamanho: number, segundos = 600) {
  const url = urlDe(chave);
  url.searchParams.set('X-Amz-Expires', String(segundos));
  const assinado = await conectar().cliente.sign(url.toString(), {
    method: 'PUT',
    headers: { 'content-length': String(tamanho) },
    aws: { signQuery: true, allHeaders: true },
  });
  return assinado.url;
}

/**
 * Link curto de leitura. Tipo e nome vão como sobrescrita da resposta, então
 * o que o navegador recebe é o que o Radar decidiu, não o que foi enviado.
 */
export async function linkDeLeitura(
  chave: string,
  resposta: { tipo: string; disposicao: string },
  segundos = 300,
) {
  const url = urlDe(chave);
  url.searchParams.set('X-Amz-Expires', String(segundos));
  url.searchParams.set('response-content-type', resposta.tipo);
  url.searchParams.set('response-content-disposition', resposta.disposicao);
  url.searchParams.set('response-cache-control', 'private, no-store');
  const assinado = await conectar().cliente.sign(url.toString(), {
    method: 'GET',
    aws: { signQuery: true },
  });
  return assinado.url;
}

/** Tamanho real do objeto no bucket, ou null se ele não existe. */
export async function tamanhoNoBucket(chave: string): Promise<number | null> {
  const res = await conectar().cliente.fetch(urlDe(chave).toString(), { method: 'HEAD' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`R2 respondeu ${res.status} ao consultar o arquivo.`);
  return Number(res.headers.get('content-length') ?? 0);
}

export async function gravarNoBucket(chave: string, bytes: Uint8Array, tipo: string) {
  const res = await conectar().cliente.fetch(urlDe(chave).toString(), {
    method: 'PUT',
    headers: { 'content-type': tipo },
    body: new Uint8Array(bytes),
  });
  if (!res.ok) throw new Error(`R2 respondeu ${res.status} ao gravar o arquivo.`);
}

export async function apagarDoBucket(chave: string) {
  const res = await conectar().cliente.fetch(urlDe(chave).toString(), { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 respondeu ${res.status} ao apagar o arquivo.`);
  }
}

export type ObjetoNoBucket = { chave: string; modificadoEm: Date };

/** Todos os objetos sob um prefixo, paginando a listagem do S3. */
export async function listarNoBucket(prefixo: string): Promise<ObjetoNoBucket[]> {
  const { cliente, base } = conectar();
  const objetos: ObjetoNoBucket[] = [];
  let continuacao: string | null = null;

  do {
    const url = new URL(base);
    url.searchParams.set('list-type', '2');
    url.searchParams.set('prefix', prefixo);
    if (continuacao) url.searchParams.set('continuation-token', continuacao);

    const res = await cliente.fetch(url.toString());
    if (!res.ok) throw new Error(`R2 respondeu ${res.status} ao listar o bucket.`);
    const xml = await res.text();

    for (const [, bloco] of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const chave = /<Key>([\s\S]*?)<\/Key>/.exec(bloco)?.[1];
      const data = /<LastModified>([\s\S]*?)<\/LastModified>/.exec(bloco)?.[1];
      if (chave && data) objetos.push({ chave: decodificarXml(chave), modificadoEm: new Date(data) });
    }
    continuacao = /<IsTruncated>true<\/IsTruncated>/.test(xml)
      ? decodificarXml(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml)?.[1] ?? '') || null
      : null;
  } while (continuacao);

  return objetos;
}

function decodificarXml(texto: string): string {
  return texto
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

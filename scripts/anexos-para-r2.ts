/**
 * Copia para o Cloudflare R2 os anexos que ainda estão no banco como data URI
 * e grava a chave de cada um. Existe para a troca de armazenamento: rode depois
 * da migration 20260924120000_anexos_no_r2 e antes da que remove "conteudo".
 *
 * Arquivos idênticos viram um objeto só (a chave é o hash do conteúdo), o que
 * junta as cópias que as recorrências faziam e deixa o script idempotente:
 * rodar de novo só trata as linhas que ainda não têm chave.
 *
 * Uso (as credenciais do R2 vêm do .env.local; a URL do banco entra explícita,
 * como em scripts/liberar-arquivos-demo.ts):
 *   DATABASE_URL="<url do Neon>" node --env-file=.env.local \
 *     --experimental-strip-types scripts/anexos-para-r2.ts
 */
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { AwsClient } from 'aws4fetch';

const url = process.env.DATABASE_URL;
if (!url?.startsWith('postgres')) {
  console.error('Defina DATABASE_URL com a URL do Postgres (Neon).');
  process.exit(1);
}
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error('Credenciais do R2 ausentes: rode com --env-file=.env.local.');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });
const r2 = new AwsClient({
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  service: 's3',
  region: 'auto',
});
const base = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;

async function existe(chave: string): Promise<boolean> {
  const res = await r2.fetch(`${base}/${chave}`, { method: 'HEAD' });
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`R2 respondeu ${res.status} ao consultar ${chave}`);
  return true;
}

const TABELAS = ['Anexo', 'AnexoRecorrencia'] as const;

async function copiar(tabela: (typeof TABELAS)[number]) {
  let copiados = 0;
  let reaproveitados = 0;

  for (;;) {
    // Em lotes pequenos: cada linha pode ter mais de 1MB de base64.
    const linhas = await prisma.$queryRawUnsafe<{ id: string; tipo: string; conteudo: string }[]>(
      `SELECT id, tipo, conteudo FROM "${tabela}"
       WHERE chave IS NULL AND conteudo IS NOT NULL LIMIT 10`,
    );
    if (linhas.length === 0) break;

    for (const l of linhas) {
      const bytes = Buffer.from(l.conteudo.slice(l.conteudo.indexOf(',') + 1), 'base64');
      const chave = `anexos/legado/${createHash('sha256').update(bytes).digest('hex')}`;

      if (await existe(chave)) {
        reaproveitados += 1;
      } else {
        const res = await r2.fetch(`${base}/${chave}`, {
          method: 'PUT',
          headers: { 'content-type': l.tipo || 'application/octet-stream' },
          body: new Uint8Array(bytes),
        });
        if (!res.ok) throw new Error(`R2 respondeu ${res.status} ao gravar ${chave}`);
        copiados += 1;
      }

      await prisma.$executeRawUnsafe(`UPDATE "${tabela}" SET chave = $1 WHERE id = $2`, chave, l.id);
    }
  }

  console.log(`${tabela}: ${copiados} arquivo(s) enviado(s), ${reaproveitados} já estava(m) no R2.`);
}

/** Confere que toda linha tem chave e que todo objeto apontado existe. */
async function verificar(): Promise<boolean> {
  let ok = true;
  for (const tabela of TABELAS) {
    const [{ semChave }] = await prisma.$queryRawUnsafe<{ semChave: bigint }[]>(
      `SELECT count(*) AS "semChave" FROM "${tabela}" WHERE chave IS NULL`,
    );
    const chaves = await prisma.$queryRawUnsafe<{ chave: string }[]>(
      `SELECT DISTINCT chave FROM "${tabela}" WHERE chave IS NOT NULL`,
    );
    let faltando = 0;
    for (const { chave } of chaves) if (!(await existe(chave))) faltando += 1;

    console.log(
      `${tabela}: ${chaves.length} arquivo(s) distinto(s), ` +
        `${Number(semChave)} linha(s) sem chave, ${faltando} objeto(s) ausente(s) no R2.`,
    );
    if (Number(semChave) > 0 || faltando > 0) ok = false;
  }
  return ok;
}

async function main() {
  for (const tabela of TABELAS) await copiar(tabela);
  const ok = await verificar();
  console.log(ok ? '\nTudo no R2.' : '\nAinda há pendências — rode de novo.');
  if (!ok) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

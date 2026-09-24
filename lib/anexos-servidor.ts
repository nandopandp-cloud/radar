import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { apagarDoBucket, listarNoBucket, tamanhoNoBucket } from '@/lib/r2';
import { limparNome, limparTipo, TAMANHO_MAXIMO, TAMANHO_MAXIMO_TEXTO } from '@/lib/anexos';

/**
 * Cada pessoa sobe dentro da própria pasta, e a confirmação só aceita chaves
 * dela: ninguém registra na sua demanda um arquivo que outra pessoa enviou.
 */
export function novaChave(usuarioId: string): string {
  return `anexos/${usuarioId}/${randomUUID()}`;
}

export type AnexoConfirmado = { nome: string; tipo: string; tamanho: number; chave: string };

type Resultado = { ok: true; valor: AnexoConfirmado[] } | { ok: false; erro: string };

/**
 * Confere os arquivos que o navegador diz ter enviado ao R2. O tamanho vem do
 * próprio bucket, não do cliente.
 */
export async function confirmarAnexos(lista: unknown[], usuarioId: string): Promise<Resultado> {
  const pasta = `anexos/${usuarioId}/`;
  const entradas = [];

  for (const entrada of lista) {
    if (!entrada || typeof entrada !== 'object') return { ok: false, erro: 'Anexo inválido.' };
    const { nome, tipo, chave } = entrada as Record<string, unknown>;
    if (typeof nome !== 'string' || !nome.trim()) {
      return { ok: false, erro: 'Anexo sem nome de arquivo.' };
    }
    if (
      typeof chave !== 'string' ||
      !chave.startsWith(pasta) ||
      !/^[0-9a-f-]{36}$/.test(chave.slice(pasta.length))
    ) {
      return { ok: false, erro: 'Anexo inválido.' };
    }
    entradas.push({ nome: limparNome(nome), tipo: limparTipo(tipo), chave });
  }

  const tamanhos = await Promise.all(entradas.map((e) => tamanhoNoBucket(e.chave)));
  const valor: AnexoConfirmado[] = [];

  for (let i = 0; i < entradas.length; i++) {
    const tamanho = tamanhos[i];
    if (tamanho === null) {
      return {
        ok: false,
        erro: `"${entradas[i].nome}" não chegou ao armazenamento. Tente enviá-lo novamente.`,
      };
    }
    if (tamanho === 0) return { ok: false, erro: `"${entradas[i].nome}" está vazio.` };
    if (tamanho > TAMANHO_MAXIMO) {
      await apagarDoBucket(entradas[i].chave);
      return { ok: false, erro: `Cada arquivo pode ter no máximo ${TAMANHO_MAXIMO_TEXTO}.` };
    }
    valor.push({ ...entradas[i], tamanho });
  }

  return { ok: true, valor };
}

/**
 * O molde de uma recorrência e as demandas que ela gera apontam para o mesmo
 * arquivo, então ele só sai do bucket quando nenhuma linha o usa mais.
 */
export async function apagarSeOrfao(chave: string) {
  const [anexos, moldes] = await Promise.all([
    prisma.anexo.count({ where: { chave } }),
    prisma.anexoRecorrencia.count({ where: { chave } }),
  ]);
  if (anexos + moldes === 0) await apagarDoBucket(chave);
}

/** Folga para não apagar um arquivo que acabou de subir e ainda vai ser confirmado. */
const CARENCIA_MS = 24 * 60 * 60 * 1000;
const MAXIMO_POR_LIMPEZA = 300;

/**
 * Remove do bucket o que nenhuma linha usa: envios nunca confirmados e os
 * arquivos de demandas, recorrências e contas apagadas em cascata no banco.
 */
export async function limparOrfaos(): Promise<number> {
  const limite = Date.now() - CARENCIA_MS;
  const antigos = (await listarNoBucket('anexos/'))
    .filter((o) => o.modificadoEm.getTime() < limite)
    .map((o) => o.chave);

  const usadas = new Set<string>();
  for (let i = 0; i < antigos.length; i += 1000) {
    const fatia = antigos.slice(i, i + 1000);
    const [anexos, moldes] = await Promise.all([
      prisma.anexo.findMany({ where: { chave: { in: fatia } }, select: { chave: true } }),
      prisma.anexoRecorrencia.findMany({ where: { chave: { in: fatia } }, select: { chave: true } }),
    ]);
    for (const a of [...anexos, ...moldes]) usadas.add(a.chave);
  }

  const orfas = antigos.filter((c) => !usadas.has(c)).slice(0, MAXIMO_POR_LIMPEZA);
  for (const chave of orfas) await apagarDoBucket(chave);
  return orfas.length;
}

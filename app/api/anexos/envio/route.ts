import { NextResponse } from 'next/server';
import { sessaoAtual } from '@/lib/auth';
import { MAXIMO_POR_DEMANDA, TAMANHO_MAXIMO, TAMANHO_MAXIMO_TEXTO } from '@/lib/anexos';
import { novaChave } from '@/lib/anexos-servidor';
import { linkDeEnvio } from '@/lib/r2';

export const dynamic = 'force-dynamic';

/**
 * Links para o navegador subir os arquivos direto no R2. O arquivo não passa
 * pela Vercel, que corta o corpo das requisições em 4,5MB. Depois de subir, o
 * cliente registra o anexo na demanda ou na recorrência, que conferem o que
 * chegou ao bucket.
 */
export async function POST(req: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });

  const corpo = await req.json().catch(() => null);
  const arquivos: unknown = corpo?.arquivos;
  if (!Array.isArray(arquivos) || arquivos.length === 0) {
    return NextResponse.json({ erro: 'Nenhum arquivo enviado.' }, { status: 400 });
  }
  if (arquivos.length > MAXIMO_POR_DEMANDA) {
    return NextResponse.json(
      { erro: `Cada demanda aceita no máximo ${MAXIMO_POR_DEMANDA} anexos.` },
      { status: 400 },
    );
  }

  const links = [];
  for (const a of arquivos) {
    const tamanho = Number(a?.tamanho);
    const nome = typeof a?.nome === 'string' ? a.nome : 'arquivo';
    if (!Number.isInteger(tamanho) || tamanho <= 0) {
      return NextResponse.json({ erro: `"${nome}" está vazio.` }, { status: 400 });
    }
    if (tamanho > TAMANHO_MAXIMO) {
      return NextResponse.json(
        { erro: `"${nome}" passa de ${TAMANHO_MAXIMO_TEXTO}. Envie um arquivo menor.` },
        { status: 400 },
      );
    }
    const chave = novaChave(sessao.sub);
    links.push({ chave, url: await linkDeEnvio(chave, tamanho) });
  }

  return NextResponse.json(links);
}

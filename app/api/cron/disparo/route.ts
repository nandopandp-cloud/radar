import { NextResponse } from 'next/server';
import { dispararAlertas } from '@/lib/disparo';

export const dynamic = 'force-dynamic';
// A apuração percorre todos os analistas e envia um e-mail por pessoa;
// o padrão de 10s do plano Hobby pode não bastar conforme o time cresce.
export const maxDuration = 60;

/**
 * Disparo automático diário, chamado pelo Vercel Cron (ver vercel.json).
 *
 * O Vercel Cron sempre usa GET e envia o header
 * `Authorization: Bearer $CRON_SECRET` automaticamente quando a variável
 * existe no projeto — por isso esta rota é separada de /api/disparo, que
 * atende a interface (POST autenticado por sessão).
 */
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET?.trim();

  // Sem segredo configurado a rota fica fechada: melhor não enviar do que
  // deixar qualquer um na internet disparar e-mails para o time inteiro.
  if (!segredo) {
    return NextResponse.json(
      { erro: 'CRON_SECRET não configurado — disparo automático desativado.' },
      { status: 503 },
    );
  }

  const enviado =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    req.headers.get('x-cron-secret');

  if (enviado !== segredo) {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 });
  }

  const resultado = await dispararAlertas();

  console.log(
    `[cron] ${resultado.diaReferencia} · modo ${resultado.modo} · ` +
      `${resultado.enviados} enviado(s), ${resultado.erros} erro(s), ` +
      `${resultado.ignorados} ignorado(s)`,
  );

  return NextResponse.json(resultado);
}

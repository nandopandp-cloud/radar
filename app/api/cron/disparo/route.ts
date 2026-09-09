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

  /*
   * Parâmetros de teste, para validar o agendamento sem acionar o time todo.
   * O Vercel Cron nunca os envia — ele chama a rota limpa, disparando para
   * todos os analistas, que é o comportamento de produção.
   */
  const { searchParams } = new URL(req.url);
  const apenasUsuarioId = searchParams.get('apenasUsuarioId') || undefined;
  const dia = searchParams.get('dia');
  const diaReferencia = dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : undefined;

  const resultado = await dispararAlertas({
    apenasUsuarioId,
    diaReferencia,
    forcar: searchParams.get('forcar') === 'true',
  });

  console.log(
    `[cron] ${resultado.diaReferencia} · modo ${resultado.modo} · ` +
      `${resultado.enviados} enviado(s), ${resultado.erros} erro(s), ` +
      `${resultado.ignorados} ignorado(s)`,
  );

  return NextResponse.json(resultado);
}
